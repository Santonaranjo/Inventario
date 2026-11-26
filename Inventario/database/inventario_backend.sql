-- =====================================================================
-- INVENTARIO - Base de datos compatible con el backend (FastAPI + Alembic)
-- PostgreSQL 16/17. Esquema = migraciones 0001..0004 del backend (alembic_version = 0004)
-- Datos = los de inventario.sql (Juliana), cargados con los servicios del backend.
--
-- USO (en una base VACIA):
--   1) Como postgres (una sola vez):
--        CREATE ROLE inventario LOGIN PASSWORD 'inventario';
--        CREATE DATABASE inventario OWNER inventario ENCODING 'UTF8' TEMPLATE template0;
--   2) Cargar este archivo con el rol de la aplicacion:
--        psql -h localhost -p 5434 -U inventario -d inventario -v ON_ERROR_STOP=1 -f inventario_backend.sql
--   3) En backend/.env (o en el docker-compose.override.yml):
--        DATABASE_URL=postgresql+psycopg://inventario:inventario@localhost:5434/inventario
--      (desde Docker el host es host.docker.internal en lugar de localhost)
--
-- Usuarios de prueba:  ADMIN   admin@inventario.com      / Admin123*
--                      CLIENTE carlos.ramirez@correo.com / Cliente123*
--
-- Diferencias con inventario.sql (para que el backend funcione):
--   * Nombres/columnas del backend: venta_detalles, inventario.stock, ventas.total,
--     clientes.tipo_documento, facturas.numero 'FAC-000001' + consecutivo, facturas.anulada,
--     movimientos con stock_anterior/stock_nuevo, tabla refresh_tokens (sesiones JWT).
--   * Sin triggers de stock: el backend actualiza inventario.stock al registrar cada movimiento
--     (con el trigger el stock se moveria dos veces).
--   * admin@inventario.local -> admin@inventario.com (el backend no acepta dominios .local).
--   * Hashes bcrypt reales en lugar de marcadores.
--   * Las 5 vistas de reporte (vw_*) se conservan, adaptadas a estas tablas.
--   * Los cambios de esquema se hacen con migraciones (alembic), no editando este archivo.
-- =====================================================================

--
-- PostgreSQL database dump
--

\restrict kPzQnY4SMbGZhsN6OfrzIl4huVW7dhYPl0cpu0BcD0bSYJmv78QbhHfDsFIO7Rq

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: estado_venta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_venta AS ENUM (
    'PENDIENTE',
    'PAGADA',
    'ANULADA'
);


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMIN',
    'CLIENTE'
);


--
-- Name: tipo_documento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_documento AS ENUM (
    'CC',
    'CE',
    'NIT',
    'PAS'
);


--
-- Name: tipo_movimiento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_movimiento AS ENUM (
    'ENTRADA',
    'SALIDA',
    'AJUSTE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    usuario_id integer,
    tipo_documento public.tipo_documento DEFAULT 'CC'::public.tipo_documento NOT NULL,
    documento character varying(30) NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(255),
    telefono character varying(30),
    direccion character varying(255),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: factura_consecutivo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_consecutivo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas (
    id integer NOT NULL,
    consecutivo integer NOT NULL,
    numero character varying(20) NOT NULL,
    venta_id integer NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    porcentaje_iva numeric(5,2) NOT NULL,
    impuestos numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha_emision timestamp with time zone DEFAULT now() NOT NULL,
    anulada boolean DEFAULT false NOT NULL,
    anulada_at timestamp with time zone,
    CONSTRAINT ck_facturas_impuestos_no_negativo CHECK ((impuestos >= (0)::numeric)),
    CONSTRAINT ck_facturas_porcentaje_iva_rango CHECK (((porcentaje_iva >= (0)::numeric) AND (porcentaje_iva <= (100)::numeric))),
    CONSTRAINT ck_facturas_subtotal_no_negativo CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT ck_facturas_total_cuadra CHECK ((total = (subtotal + impuestos)))
);


--
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    producto_id integer NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_inventario_stock_minimo_no_negativo CHECK ((stock_minimo >= 0)),
    CONSTRAINT ck_inventario_stock_no_negativo CHECK ((stock >= 0))
);


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_inventario (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    tipo public.tipo_movimiento NOT NULL,
    cantidad integer NOT NULL,
    stock_anterior integer NOT NULL,
    stock_nuevo integer NOT NULL,
    motivo character varying(255) NOT NULL,
    usuario_id integer NOT NULL,
    venta_id integer,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_movimientos_inventario_cantidad_positiva CHECK ((cantidad > 0)),
    CONSTRAINT ck_movimientos_inventario_stock_nuevo_no_negativo CHECK ((stock_nuevo >= 0))
);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    sku character varying(50) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    categoria_id integer,
    precio_venta numeric(12,2) NOT NULL,
    costo numeric(12,2) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_productos_costo_no_negativo CHECK ((costo >= (0)::numeric)),
    CONSTRAINT ck_productos_precio_venta_no_negativo CHECK ((precio_venta >= (0)::numeric))
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    jti character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revocado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(150) NOT NULL,
    rol public.rol_usuario DEFAULT 'CLIENTE'::public.rol_usuario NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: venta_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venta_detalles (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    CONSTRAINT ck_venta_detalles_cantidad_positiva CHECK ((cantidad > 0)),
    CONSTRAINT ck_venta_detalles_precio_unitario_no_negativo CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT ck_venta_detalles_subtotal_no_negativo CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: venta_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.venta_detalles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: venta_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.venta_detalles_id_seq OWNED BY public.venta_detalles.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    usuario_id integer NOT NULL,
    estado public.estado_venta DEFAULT 'PENDIENTE'::public.estado_venta NOT NULL,
    total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    observaciones character varying(255),
    pagada_at timestamp with time zone,
    anulada_at timestamp with time zone,
    motivo_anulacion character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ventas_total_no_negativo CHECK ((total >= (0)::numeric))
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: vw_facturas_detalle; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_facturas_detalle AS
 SELECT f.id AS factura_id,
    f.consecutivo,
    f.numero AS numero_formateado,
    f.fecha_emision,
        CASE
            WHEN f.anulada THEN 'ANULADA'::text
            ELSE 'EMITIDA'::text
        END AS estado,
    f.venta_id,
    cl.documento AS cliente_documento,
    cl.nombre AS cliente_nombre,
    f.subtotal,
    f.porcentaje_iva AS iva_porcentaje,
    f.impuestos AS iva,
    f.total
   FROM ((public.facturas f
     JOIN public.ventas v ON ((v.id = f.venta_id)))
     JOIN public.clientes cl ON ((cl.id = v.cliente_id)));


--
-- Name: vw_kardex; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_kardex AS
 SELECT m.id AS movimiento_id,
    m.producto_id,
    p.sku,
    p.nombre AS producto,
    m.fecha,
    m.tipo,
    (m.stock_nuevo - m.stock_anterior) AS variacion,
    m.stock_nuevo AS saldo,
    m.motivo,
    m.venta_id,
    u.nombre AS responsable
   FROM ((public.movimientos_inventario m
     JOIN public.productos p ON ((p.id = m.producto_id)))
     JOIN public.usuarios u ON ((u.id = m.usuario_id)));


--
-- Name: vw_productos_stock_bajo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_productos_stock_bajo AS
 SELECT p.id AS producto_id,
    p.sku,
    p.nombre,
    c.nombre AS categoria,
    i.stock AS stock_actual,
    i.stock_minimo,
    (i.stock_minimo - i.stock) AS faltante
   FROM ((public.productos p
     JOIN public.inventario i ON ((i.producto_id = p.id)))
     LEFT JOIN public.categorias c ON ((c.id = p.categoria_id)))
  WHERE (p.activo AND (i.stock <= i.stock_minimo));


--
-- Name: vw_ventas_por_cliente; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ventas_por_cliente AS
SELECT
    NULL::integer AS cliente_id,
    NULL::character varying(30) AS documento,
    NULL::character varying(150) AS nombre,
    NULL::bigint AS ventas_pagadas,
    NULL::bigint AS ventas_pendientes,
    NULL::bigint AS ventas_anuladas,
    NULL::numeric(12,2) AS total_comprado_sin_iva,
    NULL::timestamp with time zone AS ultima_compra;


--
-- Name: vw_ventas_totales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ventas_totales AS
SELECT
    NULL::integer AS venta_id,
    NULL::timestamp with time zone AS fecha,
    NULL::public.estado_venta AS estado,
    NULL::integer AS cliente_id,
    NULL::character varying(30) AS cliente_documento,
    NULL::character varying(150) AS cliente_nombre,
    NULL::integer AS usuario_id,
    NULL::character varying(150) AS vendedor,
    NULL::integer AS lineas,
    NULL::integer AS unidades,
    NULL::numeric(12,2) AS subtotal;


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: venta_detalles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_detalles ALTER COLUMN id SET DEFAULT nextval('public.venta_detalles_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0004
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id, nombre, descripcion, activo, created_at, updated_at) FROM stdin;
1	Electrónica	Dispositivos y accesorios electrónicos	t	2026-11-21 16:24:25.436214-05	2026-11-21 16:24:25.436214-05
2	Papelería	Artículos de oficina y escolares	t	2026-11-21 16:24:25.469797-05	2026-11-21 16:24:25.469797-05
3	Hogar	Artículos para el hogar y la oficina en casa	t	2026-11-21 16:24:25.49454-05	2026-11-21 16:24:25.49454-05
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes (id, usuario_id, tipo_documento, documento, nombre, email, telefono, direccion, activo, created_at, updated_at) FROM stdin;
1	2	CC	1053800123	Carlos Andrés Ramírez	carlos.ramirez@correo.com	3101234567	Cra 23 # 45-12, Manizales	t	2026-11-21 16:24:26.086022-05	2026-11-21 16:24:26.086022-05
2	\N	NIT	901234567-8	Distribuciones El Cafetal S.A.S.	compras@elcafetal.co	6068765432	Av. Santander # 50-30, Manizales	t	2026-11-21 16:24:26.133995-05	2026-11-21 16:24:26.133995-05
\.


--
-- Data for Name: facturas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facturas (id, consecutivo, numero, venta_id, subtotal, porcentaje_iva, impuestos, total, fecha_emision, anulada, anulada_at) FROM stdin;
1	1	FAC-000001	1	272000.00	19.00	51680.00	323680.00	2026-11-15 16:24:27.145746-05	f	\N
2	2	FAC-000002	2	2313000.00	19.00	439470.00	2752470.00	2026-11-18 16:24:27.145746-05	f	\N
\.


--
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario (producto_id, stock, stock_minimo, updated_at) FROM stdin;
2	25	8	2026-11-21 16:24:25.617519-05
3	15	5	2026-11-21 16:24:25.683792-05
8	30	10	2026-11-21 16:24:25.966816-05
4	59	15	2026-11-21 16:24:26.153264-05
5	52	10	2026-11-21 16:24:26.189428-05
1	38	10	2026-11-21 16:24:26.28154-05
10	11	4	2026-11-21 16:24:26.28154-05
6	25	30	2026-11-21 16:24:26.611348-05
7	50	20	2026-11-21 16:24:26.611348-05
9	4	5	2026-11-21 16:24:26.611348-05
\.


--
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_inventario (id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id, venta_id, fecha) FROM stdin;
1	1	ENTRADA	40	0	40	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
2	2	ENTRADA	25	0	25	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
3	3	ENTRADA	15	0	15	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
4	4	ENTRADA	60	0	60	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
5	5	ENTRADA	50	0	50	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
6	6	ENTRADA	100	0	100	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
7	7	ENTRADA	80	0	80	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
8	8	ENTRADA	30	0	30	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
9	9	ENTRADA	20	0	20	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
10	10	ENTRADA	12	0	12	Stock inicial	1	\N	2026-10-22 16:24:27.145746-05
11	4	AJUSTE	1	60	59	Unidad dañada encontrada en conteo físico	1	\N	2026-11-11 16:24:27.145746-05
12	5	AJUSTE	2	50	52	Sobrante encontrado en conteo físico	1	\N	2026-11-11 16:24:27.145746-05
13	1	SALIDA	2	40	38	Venta #1	1	1	2026-11-15 16:24:27.145746-05
14	6	SALIDA	5	100	95	Venta #1	1	1	2026-11-15 16:24:27.145746-05
15	10	SALIDA	1	12	11	Venta #1	1	1	2026-11-15 16:24:27.145746-05
16	6	SALIDA	70	95	25	Venta #2	1	2	2026-11-18 16:24:27.145746-05
17	7	SALIDA	30	80	50	Venta #2	1	2	2026-11-18 16:24:27.145746-05
18	9	SALIDA	16	20	4	Venta #2	1	2	2026-11-18 16:24:27.145746-05
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, sku, nombre, descripcion, categoria_id, precio_venta, costo, activo, created_at, updated_at) FROM stdin;
1	ELE-001	Mouse inalámbrico 2.4 GHz	Mouse óptico inalámbrico con receptor USB	1	55000.00	38000.00	t	2026-11-21 16:24:25.51855-05	2026-11-21 16:24:25.51855-05
2	ELE-002	Teclado USB en español	Teclado de membrana, distribución español	1	65000.00	42000.00	t	2026-11-21 16:24:25.617519-05	2026-11-21 16:24:25.617519-05
3	ELE-003	Audífonos con micrófono	Diadema con micrófono, conector 3.5 mm	1	89000.00	58000.00	t	2026-11-21 16:24:25.683792-05	2026-11-21 16:24:25.683792-05
4	ELE-004	Cable HDMI 2 m	Cable HDMI 2.0 de 2 metros	1	25000.00	14000.00	t	2026-11-21 16:24:25.759139-05	2026-11-21 16:24:25.759139-05
5	ELE-005	Memoria USB 64 GB	Unidad flash USB 3.0 de 64 GB	1	38000.00	26000.00	t	2026-11-21 16:24:25.816505-05	2026-11-21 16:24:25.816505-05
6	PAP-001	Resma papel carta 500 hojas	Papel bond 75 g tamaño carta	2	18000.00	12500.00	t	2026-11-21 16:24:25.863301-05	2026-11-21 16:24:25.863301-05
7	PAP-002	Cuaderno argollado 100 hojas	Cuaderno cuadriculado tapa dura	2	9500.00	6000.00	t	2026-11-21 16:24:25.922748-05	2026-11-21 16:24:25.922748-05
8	PAP-003	Caja de bolígrafos x12	Bolígrafos tinta azul punta media	2	14000.00	8500.00	t	2026-11-21 16:24:25.966816-05	2026-11-21 16:24:25.966816-05
9	HOG-001	Termo de acero inoxidable 1 L	Termo con tapa rosca, conserva temperatura	3	48000.00	31000.00	t	2026-11-21 16:24:26.004238-05	2026-11-21 16:24:26.004238-05
10	HOG-002	Lámpara de escritorio LED	Lámpara LED con brazo flexible	3	72000.00	47000.00	t	2026-11-21 16:24:26.044911-05	2026-11-21 16:24:26.044911-05
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, email, password_hash, nombre, rol, activo, created_at, updated_at) FROM stdin;
1	admin@inventario.com	$2b$12$va7E6NmSBJ2isWplCBgQY.xHi3v8rNabY0Gw7uW4FN6s0S1CNLuLC	Administrador del Sistema	ADMIN	t	2026-11-21 16:24:24.147289-05	2026-11-21 16:24:24.147289-05
2	carlos.ramirez@correo.com	$2b$12$xSIJrdecZZ000S1yKh89F.5vLo5wi/pB28OoDYf5s6Vw08UR/KdiO	Carlos Andrés Ramírez	CLIENTE	t	2026-11-21 16:24:24.147289-05	2026-11-21 16:24:24.147289-05
\.


--
-- Data for Name: venta_detalles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.venta_detalles (id, venta_id, producto_id, cantidad, precio_unitario, subtotal) FROM stdin;
1	1	1	2	55000.00	110000.00
2	1	6	5	18000.00	90000.00
3	1	10	1	72000.00	72000.00
4	2	6	70	18000.00	1260000.00
5	2	7	30	9500.00	285000.00
6	2	9	16	48000.00	768000.00
7	3	3	1	89000.00	89000.00
8	3	5	2	38000.00	76000.00
9	4	2	5	65000.00	325000.00
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventas (id, cliente_id, usuario_id, estado, total, observaciones, pagada_at, anulada_at, motivo_anulacion, created_at, updated_at) FROM stdin;
1	1	1	PAGADA	272000.00	\N	2026-11-15 16:24:27.145746-05	\N	\N	2026-11-15 16:24:27.145746-05	2026-11-15 16:24:27.145746-05
2	2	1	PAGADA	2313000.00	\N	2026-11-18 16:24:27.145746-05	\N	\N	2026-11-18 16:24:27.145746-05	2026-11-18 16:24:27.145746-05
3	1	1	PENDIENTE	165000.00	\N	\N	\N	\N	2026-11-20 16:24:27.145746-05	2026-11-20 16:24:27.145746-05
4	2	1	ANULADA	325000.00	\N	\N	2026-11-19 16:24:27.145746-05	Anulada antes de pagarse	2026-11-19 16:24:27.145746-05	2026-11-19 16:24:27.145746-05
\.


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_id_seq', 3, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clientes_id_seq', 2, true);


--
-- Name: factura_consecutivo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.factura_consecutivo_seq', 2, true);


--
-- Name: facturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.facturas_id_seq', 2, true);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_seq', 18, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_seq', 10, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 5, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 2, true);


--
-- Name: venta_detalles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.venta_detalles_id_seq', 9, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ventas_id_seq', 4, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: categorias pk_categorias; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT pk_categorias PRIMARY KEY (id);


--
-- Name: clientes pk_clientes; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT pk_clientes PRIMARY KEY (id);


--
-- Name: facturas pk_facturas; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT pk_facturas PRIMARY KEY (id);


--
-- Name: inventario pk_inventario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT pk_inventario PRIMARY KEY (producto_id);


--
-- Name: movimientos_inventario pk_movimientos_inventario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT pk_movimientos_inventario PRIMARY KEY (id);


--
-- Name: productos pk_productos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT pk_productos PRIMARY KEY (id);


--
-- Name: refresh_tokens pk_refresh_tokens; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT pk_refresh_tokens PRIMARY KEY (id);


--
-- Name: usuarios pk_usuarios; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT pk_usuarios PRIMARY KEY (id);


--
-- Name: venta_detalles pk_venta_detalles; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_detalles
    ADD CONSTRAINT pk_venta_detalles PRIMARY KEY (id);


--
-- Name: ventas pk_ventas; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT pk_ventas PRIMARY KEY (id);


--
-- Name: categorias uq_categorias_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT uq_categorias_nombre UNIQUE (nombre);


--
-- Name: clientes uq_clientes_tipo_documento_documento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT uq_clientes_tipo_documento_documento UNIQUE (tipo_documento, documento);


--
-- Name: clientes uq_clientes_usuario_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT uq_clientes_usuario_id UNIQUE (usuario_id);


--
-- Name: facturas uq_facturas_consecutivo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT uq_facturas_consecutivo UNIQUE (consecutivo);


--
-- Name: facturas uq_facturas_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT uq_facturas_numero UNIQUE (numero);


--
-- Name: facturas uq_facturas_venta_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT uq_facturas_venta_id UNIQUE (venta_id);


--
-- Name: productos uq_productos_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT uq_productos_sku UNIQUE (sku);


--
-- Name: refresh_tokens uq_refresh_tokens_jti; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT uq_refresh_tokens_jti UNIQUE (jti);


--
-- Name: usuarios uq_usuarios_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT uq_usuarios_email UNIQUE (email);


--
-- Name: venta_detalles uq_venta_detalles_venta_producto; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_detalles
    ADD CONSTRAINT uq_venta_detalles_venta_producto UNIQUE (venta_id, producto_id);


--
-- Name: ix_clientes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clientes_email ON public.clientes USING btree (email);


--
-- Name: ix_clientes_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_clientes_nombre ON public.clientes USING btree (nombre);


--
-- Name: ix_facturas_fecha_emision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_facturas_fecha_emision ON public.facturas USING btree (fecha_emision);


--
-- Name: ix_movimientos_inventario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimientos_inventario_fecha ON public.movimientos_inventario USING btree (fecha);


--
-- Name: ix_movimientos_inventario_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimientos_inventario_producto_id ON public.movimientos_inventario USING btree (producto_id);


--
-- Name: ix_movimientos_inventario_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimientos_inventario_usuario_id ON public.movimientos_inventario USING btree (usuario_id);


--
-- Name: ix_movimientos_inventario_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimientos_inventario_venta_id ON public.movimientos_inventario USING btree (venta_id);


--
-- Name: ix_productos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_productos_activo ON public.productos USING btree (activo);


--
-- Name: ix_productos_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_productos_categoria_id ON public.productos USING btree (categoria_id);


--
-- Name: ix_productos_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_productos_nombre ON public.productos USING btree (nombre);


--
-- Name: ix_refresh_tokens_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_usuario_id ON public.refresh_tokens USING btree (usuario_id);


--
-- Name: ix_venta_detalles_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_venta_detalles_producto_id ON public.venta_detalles USING btree (producto_id);


--
-- Name: ix_venta_detalles_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_venta_detalles_venta_id ON public.venta_detalles USING btree (venta_id);


--
-- Name: ix_ventas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ventas_cliente_id ON public.ventas USING btree (cliente_id);


--
-- Name: ix_ventas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ventas_estado ON public.ventas USING btree (estado);


--
-- Name: ix_ventas_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ventas_usuario_id ON public.ventas USING btree (usuario_id);


--
-- Name: vw_ventas_por_cliente _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vw_ventas_por_cliente AS
 SELECT cl.id AS cliente_id,
    cl.documento,
    cl.nombre,
    count(vt.venta_id) FILTER (WHERE (vt.estado = 'PAGADA'::public.estado_venta)) AS ventas_pagadas,
    count(vt.venta_id) FILTER (WHERE (vt.estado = 'PENDIENTE'::public.estado_venta)) AS ventas_pendientes,
    count(vt.venta_id) FILTER (WHERE (vt.estado = 'ANULADA'::public.estado_venta)) AS ventas_anuladas,
    (COALESCE(sum(vt.subtotal) FILTER (WHERE (vt.estado = 'PAGADA'::public.estado_venta)), (0)::numeric))::numeric(12,2) AS total_comprado_sin_iva,
    max(vt.fecha) FILTER (WHERE (vt.estado = 'PAGADA'::public.estado_venta)) AS ultima_compra
   FROM (public.clientes cl
     LEFT JOIN public.vw_ventas_totales vt ON ((vt.cliente_id = cl.id)))
  GROUP BY cl.id;


--
-- Name: vw_ventas_totales _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vw_ventas_totales AS
 SELECT v.id AS venta_id,
    v.created_at AS fecha,
    v.estado,
    v.cliente_id,
    cl.documento AS cliente_documento,
    cl.nombre AS cliente_nombre,
    v.usuario_id,
    u.nombre AS vendedor,
    (count(d.id))::integer AS lineas,
    (COALESCE(sum(d.cantidad), (0)::bigint))::integer AS unidades,
    v.total AS subtotal
   FROM (((public.ventas v
     JOIN public.clientes cl ON ((cl.id = v.cliente_id)))
     JOIN public.usuarios u ON ((u.id = v.usuario_id)))
     LEFT JOIN public.venta_detalles d ON ((d.venta_id = v.id)))
  GROUP BY v.id, cl.id, u.id;


--
-- Name: clientes fk_clientes_usuario_id_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT fk_clientes_usuario_id_usuarios FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: facturas fk_facturas_venta_id_ventas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT fk_facturas_venta_id_ventas FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE RESTRICT;


--
-- Name: inventario fk_inventario_producto_id_productos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inventario_producto_id_productos FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: movimientos_inventario fk_movimientos_inventario_producto_id_productos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT fk_movimientos_inventario_producto_id_productos FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: movimientos_inventario fk_movimientos_inventario_usuario_id_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT fk_movimientos_inventario_usuario_id_usuarios FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: movimientos_inventario fk_movimientos_inventario_venta_id_ventas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT fk_movimientos_inventario_venta_id_ventas FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE RESTRICT;


--
-- Name: productos fk_productos_categoria_id_categorias; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT fk_productos_categoria_id_categorias FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE RESTRICT;


--
-- Name: refresh_tokens fk_refresh_tokens_usuario_id_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_usuario_id_usuarios FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: venta_detalles fk_venta_detalles_producto_id_productos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_detalles
    ADD CONSTRAINT fk_venta_detalles_producto_id_productos FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: venta_detalles fk_venta_detalles_venta_id_ventas; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_detalles
    ADD CONSTRAINT fk_venta_detalles_venta_id_ventas FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: ventas fk_ventas_cliente_id_clientes; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT fk_ventas_cliente_id_clientes FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: ventas fk_ventas_usuario_id_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT fk_ventas_usuario_id_usuarios FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict kPzQnY4SMbGZhsN6OfrzIl4huVW7dhYPl0cpu0BcD0bSYJmv78QbhHfDsFIO7Rq

