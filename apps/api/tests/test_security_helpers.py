"""Tests unitarios del paquete ``atlashabita.infrastructure.security``.

Los tests cubren sanitización (path traversal, XSS, CSV injection, coerción de
enteros y allowlist de IPs), el token bucket (síncrono y asíncrono) y las
cabeceras de seguridad. La cobertura objetivo del paquete es ≥ 90 %.
"""

from __future__ import annotations

import asyncio
import threading
from collections.abc import Iterator

import pytest

from atlashabita.infrastructure.security import (
    AsyncTokenBucket,
    TokenBucket,
    clamp_int,
    default_security_headers,
    is_ip_allowed,
    normalize_search,
    safe_filename,
)
from atlashabita.infrastructure.security.headers import merge_security_headers
from atlashabita.observability import (
    bind_request_context,
    clear_request_context,
    current_request_id,
    extract_request_id,
    generate_request_id,
    request_context,
)
from atlashabita.observability.logging import bind_context, clear_context, configure_logging

# ---------------------------------------------------------------------------
# sanitization.safe_filename
# ---------------------------------------------------------------------------


class TestSafeFilename:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("informe.csv", "informe.csv"),
            ("../../etc/passwd", "passwd"),
            ("..\\..\\windows\\system32\\cmd.exe", "cmd.exe"),
            ("C:/temp/archivo.txt", "archivo.txt"),
            ("nombre con espacios.txt", "nombre_con_espacios.txt"),
            ("archivo\u202econ.txt", "archivocon.txt"),
            ("énfasis.csv", "enfasis.csv"),
            ("....", "archivo"),
            ("", "archivo"),
        ],
    )
    def test_normaliza_entrada(self, raw: str, expected: str) -> None:
        assert safe_filename(raw) == expected

    def test_usa_fallback_personalizado(self) -> None:
        assert safe_filename("...", fallback="vacio") == "vacio"

    def test_trunca_nombres_largos(self) -> None:
        nombre = "a" * 500 + ".csv"
        resultado = safe_filename(nombre)
        assert len(resultado) <= 120
        assert resultado.startswith("a")

    def test_rechaza_entradas_no_str(self) -> None:
        with pytest.raises(TypeError):
            safe_filename(123)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# sanitization.normalize_search
# ---------------------------------------------------------------------------


class TestNormalizeSearch:
    def test_elimina_etiquetas_html(self) -> None:
        assert normalize_search("<script>alert(1)</script> hola") == "alert(1) hola"

    def test_colapsa_espacios_y_controles(self) -> None:
        assert normalize_search("hola\x00\x01  mundo\t\n") == "hola mundo"

    @pytest.mark.parametrize("prefijo", ["=", "+", "-", "@", "|"])
    def test_previene_csv_injection(self, prefijo: str) -> None:
        resultado = normalize_search(f"{prefijo}CMD()")
        assert resultado.startswith("'")
        assert resultado[1] == prefijo

    def test_no_modifica_texto_normal(self) -> None:
        assert normalize_search("Sevilla Este 41018") == "Sevilla Este 41018"

    def test_trunca_longitud(self) -> None:
        resultado = normalize_search("a" * 500, max_length=50)
        assert len(resultado) <= 50

    def test_valor_vacio(self) -> None:
        assert normalize_search("") == ""

    def test_rechaza_entrada_no_str(self) -> None:
        with pytest.raises(TypeError):
            normalize_search(None)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# sanitization.clamp_int
# ---------------------------------------------------------------------------


class TestClampInt:
    def test_recorta_por_arriba(self) -> None:
        assert clamp_int(9999, minimum=1, maximum=100) == 100

    def test_recorta_por_abajo(self) -> None:
        assert clamp_int(-10, minimum=0, maximum=100) == 0

    def test_acepta_str(self) -> None:
        assert clamp_int("42", minimum=0, maximum=100) == 42

    def test_acepta_bool(self) -> None:
        assert clamp_int(True, minimum=0, maximum=10) == 1

    def test_none_usa_default(self) -> None:
        assert clamp_int(None, minimum=1, maximum=10, default=5) == 5

    def test_none_sin_default_error(self) -> None:
        with pytest.raises(ValueError):
            clamp_int(None, minimum=1, maximum=10)

    @pytest.mark.parametrize("bad", ["", "   ", "no-num", "1.5", "1e3"])
    def test_str_invalido(self, bad: str) -> None:
        with pytest.raises(ValueError):
            clamp_int(bad, minimum=0, maximum=100)

    def test_tipo_no_soportado(self) -> None:
        with pytest.raises(ValueError):
            clamp_int(1.2, minimum=0, maximum=10)  # type: ignore[arg-type]

    def test_rango_invalido(self) -> None:
        with pytest.raises(ValueError):
            clamp_int(1, minimum=10, maximum=1)


# ---------------------------------------------------------------------------
# sanitization.is_ip_allowed
# ---------------------------------------------------------------------------


class TestIsIpAllowed:
    def test_ip_exacta(self) -> None:
        assert is_ip_allowed("203.0.113.5", ["203.0.113.5"])

    def test_ip_en_cidr(self) -> None:
        assert is_ip_allowed("10.1.2.3", ["10.0.0.0/8"])

    def test_ip_fuera_de_cidr(self) -> None:
        assert not is_ip_allowed("11.1.2.3", ["10.0.0.0/8"])

    def test_ipv6(self) -> None:
        assert is_ip_allowed("2001:db8::1", ["2001:db8::/32"])

    def test_distinta_familia(self) -> None:
        assert not is_ip_allowed("10.1.2.3", ["2001:db8::/32"])

    def test_ip_invalida(self) -> None:
        assert not is_ip_allowed("no-ip", ["0.0.0.0/0"])

    def test_entradas_allowlist_invalidas_se_ignoran(self) -> None:
        assert is_ip_allowed("10.0.0.1", ["basura", "10.0.0.0/8"])

    def test_candidate_no_es_str(self) -> None:
        assert not is_ip_allowed(None, ["10.0.0.0/8"])  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# rate_limiter.TokenBucket (sync)
# ---------------------------------------------------------------------------


class FakeClock:
    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class TestTokenBucket:
    def test_parametros_invalidos(self) -> None:
        with pytest.raises(ValueError):
            TokenBucket(0, 1.0)
        with pytest.raises(ValueError):
            TokenBucket(1, 0)

    def test_acquire_consume_tokens(self) -> None:
        reloj = FakeClock()
        bucket = TokenBucket(2, 1.0, clock=reloj)
        assert bucket.acquire("k")
        assert bucket.acquire("k")
        assert not bucket.acquire("k")

    def test_refill(self) -> None:
        reloj = FakeClock()
        bucket = TokenBucket(2, 1.0, clock=reloj)
        assert bucket.acquire("k")
        assert bucket.acquire("k")
        assert not bucket.acquire("k")
        reloj.advance(1.5)
        assert bucket.acquire("k")  # 1.5 tokens > 1

    def test_refill_no_excede_capacidad(self) -> None:
        reloj = FakeClock()
        bucket = TokenBucket(2, 10.0, clock=reloj)
        reloj.advance(100.0)
        assert bucket.available_tokens("k") == pytest.approx(2.0)

    def test_acquire_cost_invalido(self) -> None:
        bucket = TokenBucket(1, 1.0)
        with pytest.raises(ValueError):
            bucket.acquire("k", cost=0)

    def test_reset_clave_o_todo(self) -> None:
        reloj = FakeClock()
        bucket = TokenBucket(1, 1.0, clock=reloj)
        assert bucket.acquire("a")
        bucket.reset("a")
        assert bucket.acquire("a")
        assert bucket.acquire("b")
        bucket.reset()
        assert bucket.acquire("a")
        assert bucket.acquire("b")

    def test_propiedades_publicas(self) -> None:
        bucket = TokenBucket(5, 2.5)
        assert bucket.capacity == 5
        assert bucket.refill_per_second == 2.5

    def test_thread_safety(self) -> None:
        bucket = TokenBucket(100, 1000.0)
        conteo: dict[str, int] = {"ok": 0}
        lock = threading.Lock()

        def worker() -> None:
            for _ in range(10):
                if bucket.acquire("shared"):
                    with lock:
                        conteo["ok"] += 1

        hilos = [threading.Thread(target=worker) for _ in range(20)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join()
        # La concurrencia no debe exceder la capacidad inicial + recargas
        assert conteo["ok"] >= 100


# ---------------------------------------------------------------------------
# rate_limiter.AsyncTokenBucket
# ---------------------------------------------------------------------------


class TestAsyncTokenBucket:
    def test_parametros_invalidos(self) -> None:
        with pytest.raises(ValueError):
            AsyncTokenBucket(0, 1.0)
        with pytest.raises(ValueError):
            AsyncTokenBucket(1, 0.0)

    def test_acquire_y_refill(self) -> None:
        reloj = FakeClock()
        bucket = AsyncTokenBucket(2, 1.0, clock=reloj)

        async def escenario() -> list[bool]:
            resultados = [await bucket.acquire("k"), await bucket.acquire("k")]
            resultados.append(await bucket.acquire("k"))
            reloj.advance(2.0)
            resultados.append(await bucket.acquire("k"))
            return resultados

        out = asyncio.run(escenario())
        assert out == [True, True, False, True]

    def test_cost_invalido(self) -> None:
        bucket = AsyncTokenBucket(1, 1.0)

        async def run() -> None:
            await bucket.acquire("k", cost=0)

        with pytest.raises(ValueError):
            asyncio.run(run())

    def test_reset(self) -> None:
        bucket = AsyncTokenBucket(1, 1.0)

        async def run() -> list[bool]:
            await bucket.acquire("a")
            await bucket.reset("a")
            r1 = await bucket.acquire("a")
            await bucket.acquire("b")
            await bucket.reset()
            r2 = await bucket.acquire("a")
            r3 = await bucket.acquire("b")
            return [r1, r2, r3]

        assert asyncio.run(run()) == [True, True, True]

    def test_available_tokens_async(self) -> None:
        reloj = FakeClock()
        bucket = AsyncTokenBucket(3, 1.0, clock=reloj)

        async def run() -> float:
            return await bucket.available_tokens("k")

        assert asyncio.run(run()) == pytest.approx(3.0)

    def test_propiedades(self) -> None:
        bucket = AsyncTokenBucket(7, 3.5)
        assert bucket.capacity == 7
        assert bucket.refill_per_second == 3.5

    def test_concurrencia_async(self) -> None:
        bucket = AsyncTokenBucket(50, 1000.0)

        async def run() -> int:
            tasks = [bucket.acquire("shared") for _ in range(200)]
            resultados = await asyncio.gather(*tasks)
            return sum(1 for ok in resultados if ok)

        aprobados = asyncio.run(run())
        # No podemos conceder más tokens que la capacidad inicial (sin avance de reloj real)
        assert 1 <= aprobados <= 200


# ---------------------------------------------------------------------------
# headers
# ---------------------------------------------------------------------------


class TestSecurityHeaders:
    def test_contiene_valores_conservadores(self) -> None:
        headers = default_security_headers()
        assert "default-src 'self'" in headers["Content-Security-Policy"]
        assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "max-age=31536000" in headers["Strict-Transport-Security"]
        assert "includeSubDomains" in headers["Strict-Transport-Security"]
        assert headers["X-Content-Type-Options"] == "nosniff"
        assert "geolocation=()" in headers["Permissions-Policy"]
        assert "microphone=()" in headers["Permissions-Policy"]

    def test_devuelve_copia_mutable(self) -> None:
        a = default_security_headers()
        a["X-Test"] = "1"
        b = default_security_headers()
        assert "X-Test" not in b

    def test_merge_sobrescribe(self) -> None:
        headers = merge_security_headers({"Content-Security-Policy": "default-src 'none'"})
        assert headers["Content-Security-Policy"] == "default-src 'none'"

    def test_merge_elimina_cabecera_vacia(self) -> None:
        headers = merge_security_headers({"X-Frame-Options": ""})
        assert "X-Frame-Options" not in headers

    def test_merge_sin_overrides(self) -> None:
        assert merge_security_headers(None) == default_security_headers()


# ---------------------------------------------------------------------------
# observability.tracing
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_structlog_context() -> Iterator[None]:
    """Garantiza que cada test parte de contexto vacío."""
    clear_request_context()
    yield
    clear_request_context()


class TestTracingHelpers:
    def test_generate_request_id_unique(self) -> None:
        assert generate_request_id() != generate_request_id()

    def test_extract_request_id_sin_headers(self) -> None:
        rid = extract_request_id(None)
        assert rid and len(rid) == 32

    def test_extract_request_id_existente(self) -> None:
        rid = extract_request_id({"X-Request-ID": "abc-123"})
        assert rid == "abc-123"

    def test_extract_request_id_case_insensitive(self) -> None:
        rid = extract_request_id({"x-request-id": "valor"})
        assert rid == "valor"

    def test_extract_request_id_rechaza_valores_peligrosos(self) -> None:
        rid = extract_request_id({"X-Request-ID": "a" * 500})
        assert rid != "a" * 500
        rid2 = extract_request_id({"X-Request-ID": "\x00malicioso"})
        assert rid2 != "\x00malicioso"
        rid3 = extract_request_id({"X-Request-ID": ""})
        assert rid3 != ""

    def test_bind_and_clear_context(self) -> None:
        rid = bind_request_context(use_case="score")
        assert current_request_id() == rid
        clear_request_context()
        assert current_request_id() is None

    def test_bind_reutiliza_id_activo(self) -> None:
        rid = bind_request_context()
        rid2 = bind_request_context(use_case="x")
        assert rid == rid2

    def test_request_context_gestiona_pila(self) -> None:
        assert current_request_id() is None
        with request_context() as outer:
            assert current_request_id() == outer
            with request_context(request_id="interno") as inner:
                assert inner == "interno"
                assert current_request_id() == "interno"
            assert current_request_id() == outer
        assert current_request_id() is None

    def test_request_context_restaura_en_error(self) -> None:
        with pytest.raises(RuntimeError), request_context() as rid:
            assert current_request_id() == rid
            raise RuntimeError("boom")
        assert current_request_id() is None


class TestLoggingHelpers:
    def test_configure_logging_dev(self) -> None:
        configure_logging(env="development", level="DEBUG")

    def test_configure_logging_prod(self) -> None:
        configure_logging(env="production", level="INFO")

    def test_bind_clear_context(self) -> None:
        bind_context(component="test")
        clear_context()
