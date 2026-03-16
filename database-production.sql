--
-- PostgreSQL database dump
--

\restrict KTVLRwU9RnOFDGGRm0Jx0zKHBsnFfPUL71SaP9li4h6a1aXeMndVH9G9tXSw1D4

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_user (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    nama_lengkap text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: admin_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_user_id_seq OWNED BY public.admin_user.id;


--
-- Name: donasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donasi (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    kk_id integer NOT NULL,
    nama_donatur text NOT NULL,
    jumlah integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: donasi_campaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donasi_campaign (
    id integer NOT NULL,
    judul text NOT NULL,
    deskripsi text NOT NULL,
    target_dana integer,
    status text DEFAULT 'aktif'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: donasi_campaign_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donasi_campaign_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donasi_campaign_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donasi_campaign_id_seq OWNED BY public.donasi_campaign.id;


--
-- Name: donasi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donasi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donasi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donasi_id_seq OWNED BY public.donasi.id;


--
-- Name: izin_tetangga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.izin_tetangga (
    id integer NOT NULL,
    usaha_id integer NOT NULL,
    posisi text NOT NULL,
    nama_warga text NOT NULL,
    nomor_whatsapp text,
    status_persetujuan text DEFAULT 'belum'::text NOT NULL,
    alasan_penolakan text,
    tanggal_persetujuan text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: izin_tetangga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.izin_tetangga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: izin_tetangga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.izin_tetangga_id_seq OWNED BY public.izin_tetangga.id;


--
-- Name: kartu_keluarga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kartu_keluarga (
    id integer NOT NULL,
    nomor_kk text NOT NULL,
    rt integer NOT NULL,
    alamat text NOT NULL,
    status_rumah text DEFAULT 'Milik Sendiri'::text NOT NULL,
    jumlah_penghuni integer DEFAULT 1 NOT NULL,
    kondisi_bangunan text DEFAULT 'Permanen'::text NOT NULL,
    sumber_air text DEFAULT 'PDAM'::text NOT NULL,
    sanitasi_wc text DEFAULT 'Jamban Sendiri'::text NOT NULL,
    listrik text DEFAULT 'PLN 900 VA'::text NOT NULL,
    penerima_bansos boolean DEFAULT false NOT NULL,
    link_gmaps text,
    latitude text,
    longitude text,
    created_at timestamp without time zone DEFAULT now(),
    foto_kk text,
    jenis_bansos text
);


--
-- Name: kartu_keluarga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kartu_keluarga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kartu_keluarga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kartu_keluarga_id_seq OWNED BY public.kartu_keluarga.id;


--
-- Name: karyawan_usaha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.karyawan_usaha (
    id integer NOT NULL,
    usaha_id integer NOT NULL,
    nama_lengkap text NOT NULL,
    nik text NOT NULL,
    alamat text NOT NULL,
    nomor_whatsapp text,
    jabatan text NOT NULL,
    tanggal_mulai_kerja text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: karyawan_usaha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.karyawan_usaha_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: karyawan_usaha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.karyawan_usaha_id_seq OWNED BY public.karyawan_usaha.id;


--
-- Name: kas_rw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kas_rw (
    id integer NOT NULL,
    tipe text NOT NULL,
    kategori text NOT NULL,
    jumlah integer NOT NULL,
    keterangan text NOT NULL,
    tanggal text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    campaign_id integer
);


--
-- Name: kas_rw_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kas_rw_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kas_rw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kas_rw_id_seq OWNED BY public.kas_rw.id;


--
-- Name: laporan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laporan (
    id integer NOT NULL,
    warga_id integer NOT NULL,
    kk_id integer NOT NULL,
    jenis_laporan text DEFAULT 'umum'::text NOT NULL,
    judul text NOT NULL,
    isi text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tanggapan_admin text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: laporan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.laporan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: laporan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.laporan_id_seq OWNED BY public.laporan.id;


--
-- Name: monthly_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_snapshot (
    id integer NOT NULL,
    month text NOT NULL,
    total_kk integer DEFAULT 0 NOT NULL,
    total_warga integer DEFAULT 0 NOT NULL,
    pengangguran integer DEFAULT 0 NOT NULL,
    wa_registered integer DEFAULT 0 NOT NULL,
    ktp_uploaded integer DEFAULT 0 NOT NULL,
    kk_foto_uploaded integer DEFAULT 0 NOT NULL,
    penerima_bansos integer DEFAULT 0 NOT NULL,
    usaha_berizin integer DEFAULT 0 NOT NULL,
    total_usaha integer DEFAULT 0 NOT NULL,
    laporan_selesai integer DEFAULT 0 NOT NULL,
    total_laporan integer DEFAULT 0 NOT NULL,
    surat_selesai integer DEFAULT 0 NOT NULL,
    total_surat integer DEFAULT 0 NOT NULL,
    pemasukan integer DEFAULT 0 NOT NULL,
    pengeluaran_snapshot integer DEFAULT 0 NOT NULL,
    saldo integer DEFAULT 0 NOT NULL,
    warga_singgah_aktif integer DEFAULT 0 NOT NULL,
    indeks_kemajuan integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: monthly_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monthly_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_snapshot_id_seq OWNED BY public.monthly_snapshot.id;


--
-- Name: pemilik_kost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pemilik_kost (
    id integer NOT NULL,
    nama_kost text NOT NULL,
    nama_pemilik text NOT NULL,
    nomor_wa_pemilik text NOT NULL,
    rt integer NOT NULL,
    alamat_lengkap text NOT NULL,
    jumlah_pintu integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pemilik_kost_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pemilik_kost_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pemilik_kost_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pemilik_kost_id_seq OWNED BY public.pemilik_kost.id;


--
-- Name: pengajuan_bansos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengajuan_bansos (
    id integer NOT NULL,
    kk_id integer NOT NULL,
    jenis_pengajuan text NOT NULL,
    jenis_bansos text NOT NULL,
    alasan text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pengajuan_bansos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pengajuan_bansos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pengajuan_bansos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pengajuan_bansos_id_seq OWNED BY public.pengajuan_bansos.id;


--
-- Name: profile_edit_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_edit_request (
    id integer NOT NULL,
    warga_id integer NOT NULL,
    kk_id integer NOT NULL,
    field_changes jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: profile_edit_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profile_edit_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profile_edit_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profile_edit_request_id_seq OWNED BY public.profile_edit_request.id;


--
-- Name: riwayat_kontrak; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_kontrak (
    id integer NOT NULL,
    warga_singgah_id integer NOT NULL,
    tanggal_mulai_lama text NOT NULL,
    tanggal_habis_lama text NOT NULL,
    tanggal_mulai_baru text NOT NULL,
    tanggal_habis_baru text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: riwayat_kontrak_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riwayat_kontrak_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riwayat_kontrak_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riwayat_kontrak_id_seq OWNED BY public.riwayat_kontrak.id;


--
-- Name: riwayat_stiker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_stiker (
    id integer NOT NULL,
    usaha_id integer NOT NULL,
    nomor_stiker text NOT NULL,
    tanggal_terbit text NOT NULL,
    tanggal_expired text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: riwayat_stiker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riwayat_stiker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riwayat_stiker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riwayat_stiker_id_seq OWNED BY public.riwayat_stiker.id;


--
-- Name: rt_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rt_data (
    id integer NOT NULL,
    nomor_rt integer NOT NULL,
    nama_ketua text NOT NULL,
    nomor_whatsapp text
);


--
-- Name: rt_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rt_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rt_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rt_data_id_seq OWNED BY public.rt_data.id;


--
-- Name: surat_rw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surat_rw (
    id integer NOT NULL,
    jenis_surat text NOT NULL,
    perihal text NOT NULL,
    tujuan text,
    isi_surat text,
    tanggal_surat text,
    created_at timestamp without time zone DEFAULT now(),
    nomor_surat text
);


--
-- Name: surat_rw_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surat_rw_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surat_rw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surat_rw_id_seq OWNED BY public.surat_rw.id;


--
-- Name: surat_warga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surat_warga (
    id integer NOT NULL,
    warga_id integer NOT NULL,
    kk_id integer NOT NULL,
    jenis_surat text NOT NULL,
    perihal text NOT NULL,
    keterangan text,
    isi_surat text,
    status text DEFAULT 'pending'::text NOT NULL,
    nomor_rt integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    nomor_surat text,
    metode_layanan text DEFAULT 'print_mandiri'::text NOT NULL,
    pdf_code text,
    pdf_path text,
    file_surat text
);


--
-- Name: surat_warga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surat_warga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: surat_warga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surat_warga_id_seq OWNED BY public.surat_warga.id;


--
-- Name: survey_usaha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_usaha (
    id integer NOT NULL,
    usaha_id integer NOT NULL,
    tanggal_survey text NOT NULL,
    petugas_survey text NOT NULL,
    kesesuaian_data text NOT NULL,
    dampak_kebisingan integer DEFAULT 1 NOT NULL,
    dampak_bau integer DEFAULT 1 NOT NULL,
    dampak_limbah integer DEFAULT 1 NOT NULL,
    kondisi_lokasi text,
    catatan_survey text,
    foto_lokasi text,
    rekomendasi text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: survey_usaha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.survey_usaha_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: survey_usaha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.survey_usaha_id_seq OWNED BY public.survey_usaha.id;


--
-- Name: usaha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usaha (
    id integer NOT NULL,
    nama_pemilik text NOT NULL,
    nik_pemilik text NOT NULL,
    nomor_wa_pemilik text NOT NULL,
    alamat_pemilik text NOT NULL,
    nama_usaha text NOT NULL,
    jenis_usaha text NOT NULL,
    alamat_usaha text NOT NULL,
    rt integer NOT NULL,
    nib text,
    deskripsi_usaha text,
    lama_usaha text,
    jam_operasional_mulai text,
    jam_operasional_selesai text,
    modal_usaha text,
    omset_bulanan text,
    status text DEFAULT 'pendaftaran'::text NOT NULL,
    nomor_stiker text,
    tanggal_stiker_terbit text,
    tanggal_stiker_expired text,
    alasan_penolakan text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: usaha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usaha_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usaha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usaha_id_seq OWNED BY public.usaha.id;


--
-- Name: wa_blast; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wa_blast (
    id integer NOT NULL,
    pesan text NOT NULL,
    kategori_filter text DEFAULT 'semua'::text NOT NULL,
    filter_rt integer,
    jumlah_penerima integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    jumlah_berhasil integer DEFAULT 0 NOT NULL
);


--
-- Name: wa_blast_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wa_blast_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wa_blast_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wa_blast_id_seq OWNED BY public.wa_blast.id;


--
-- Name: warga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warga (
    id integer NOT NULL,
    kk_id integer NOT NULL,
    nama_lengkap text NOT NULL,
    nik text NOT NULL,
    nomor_whatsapp text,
    jenis_kelamin text NOT NULL,
    status_perkawinan text NOT NULL,
    agama text DEFAULT 'Islam'::text NOT NULL,
    kedudukan_keluarga text NOT NULL,
    tanggal_lahir text,
    pekerjaan text,
    status_kependudukan text DEFAULT 'Aktif'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    foto_ktp text,
    pendidikan text
);


--
-- Name: warga_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warga_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warga_id_seq OWNED BY public.warga.id;


--
-- Name: warga_singgah; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warga_singgah (
    id integer NOT NULL,
    pemilik_kost_id integer NOT NULL,
    nama_lengkap text NOT NULL,
    nik text NOT NULL,
    nomor_whatsapp text NOT NULL,
    pekerjaan text NOT NULL,
    tanggal_mulai_kontrak text NOT NULL,
    tanggal_habis_kontrak text NOT NULL,
    jumlah_penghuni integer DEFAULT 1 NOT NULL,
    keperluan_tinggal text NOT NULL,
    status text DEFAULT 'aktif'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: warga_singgah_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warga_singgah_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warga_singgah_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warga_singgah_id_seq OWNED BY public.warga_singgah.id;


--
-- Name: admin_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_user ALTER COLUMN id SET DEFAULT nextval('public.admin_user_id_seq'::regclass);


--
-- Name: donasi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi ALTER COLUMN id SET DEFAULT nextval('public.donasi_id_seq'::regclass);


--
-- Name: donasi_campaign id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi_campaign ALTER COLUMN id SET DEFAULT nextval('public.donasi_campaign_id_seq'::regclass);


--
-- Name: izin_tetangga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.izin_tetangga ALTER COLUMN id SET DEFAULT nextval('public.izin_tetangga_id_seq'::regclass);


--
-- Name: kartu_keluarga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kartu_keluarga ALTER COLUMN id SET DEFAULT nextval('public.kartu_keluarga_id_seq'::regclass);


--
-- Name: karyawan_usaha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan_usaha ALTER COLUMN id SET DEFAULT nextval('public.karyawan_usaha_id_seq'::regclass);


--
-- Name: kas_rw id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kas_rw ALTER COLUMN id SET DEFAULT nextval('public.kas_rw_id_seq'::regclass);


--
-- Name: laporan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan ALTER COLUMN id SET DEFAULT nextval('public.laporan_id_seq'::regclass);


--
-- Name: monthly_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_snapshot ALTER COLUMN id SET DEFAULT nextval('public.monthly_snapshot_id_seq'::regclass);


--
-- Name: pemilik_kost id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemilik_kost ALTER COLUMN id SET DEFAULT nextval('public.pemilik_kost_id_seq'::regclass);


--
-- Name: pengajuan_bansos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan_bansos ALTER COLUMN id SET DEFAULT nextval('public.pengajuan_bansos_id_seq'::regclass);


--
-- Name: profile_edit_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_edit_request ALTER COLUMN id SET DEFAULT nextval('public.profile_edit_request_id_seq'::regclass);


--
-- Name: riwayat_kontrak id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kontrak ALTER COLUMN id SET DEFAULT nextval('public.riwayat_kontrak_id_seq'::regclass);


--
-- Name: riwayat_stiker id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_stiker ALTER COLUMN id SET DEFAULT nextval('public.riwayat_stiker_id_seq'::regclass);


--
-- Name: rt_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rt_data ALTER COLUMN id SET DEFAULT nextval('public.rt_data_id_seq'::regclass);


--
-- Name: surat_rw id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_rw ALTER COLUMN id SET DEFAULT nextval('public.surat_rw_id_seq'::regclass);


--
-- Name: surat_warga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_warga ALTER COLUMN id SET DEFAULT nextval('public.surat_warga_id_seq'::regclass);


--
-- Name: survey_usaha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_usaha ALTER COLUMN id SET DEFAULT nextval('public.survey_usaha_id_seq'::regclass);


--
-- Name: usaha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usaha ALTER COLUMN id SET DEFAULT nextval('public.usaha_id_seq'::regclass);


--
-- Name: wa_blast id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wa_blast ALTER COLUMN id SET DEFAULT nextval('public.wa_blast_id_seq'::regclass);


--
-- Name: warga id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga ALTER COLUMN id SET DEFAULT nextval('public.warga_id_seq'::regclass);


--
-- Name: warga_singgah id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga_singgah ALTER COLUMN id SET DEFAULT nextval('public.warga_singgah_id_seq'::regclass);


--
-- Data for Name: admin_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_user (id, username, password_hash, nama_lengkap, is_active, created_at) FROM stdin;
1	arnia23	$2b$12$PFTH7.lr4u6tEA/v9dDQMepizu6CYheBfuZf3tsP1KAifpUwnxusW	Arnia	t	2026-03-08 18:15:19.739238
2	emulawarman	$2b$12$uZPUvhOV13XGTQ6O3MmYkeW9gfg1OmjTmGRPicync7qv7X4Rrk53m	Eka	t	2026-03-08 18:15:19.74749
3	radenraka	$2b$12$DhuH8suIh3XX0HddDhWlre1mN/Jw0fPMD/NCVtOF0wBK0XNLKt8AW	Raden	t	2026-03-08 18:15:19.751735
4	rezel123	$2b$12$wbdjSkqCPufLlIbe2MKJZumPzUaXtHSsCt0Bx5JN4TYBEqEXquigi	Rezel	t	2026-03-08 18:15:19.755048
\.


--
-- Data for Name: donasi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donasi (id, campaign_id, kk_id, nama_donatur, jumlah, status, created_at) FROM stdin;
1	2	1	Buce	500000	dikonfirmasi	2026-03-12 09:44:01.323467
\.


--
-- Data for Name: donasi_campaign; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donasi_campaign (id, judul, deskripsi, target_dana, status, created_at) FROM stdin;
2	Donasi Sosial	Untuk Kegiatan Sosial di RW03	50000	aktif	2026-03-11 01:13:45.626968
1	Acara Pembersihan Sungai RW3	Untuk Alat dan Konsumsi dan juga kadedeuh ke warga yang bersihin sungai	2000000	selesai	2026-03-09 20:25:01.358578
3	Donasi Keamanan	Untuk Kegiatan Ronda di RW03	50000000	aktif	2026-03-11 01:14:23.695869
4	Donasi Posyandu Kesejahteraan	Untuk Kegiatan Posyandu dan Posbindu	\N	aktif	2026-03-12 06:54:03.329619
\.


--
-- Data for Name: izin_tetangga; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.izin_tetangga (id, usaha_id, posisi, nama_warga, nomor_whatsapp, status_persetujuan, alasan_penolakan, tanggal_persetujuan, created_at) FROM stdin;
\.


--
-- Data for Name: kartu_keluarga; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kartu_keluarga (id, nomor_kk, rt, alamat, status_rumah, jumlah_penghuni, kondisi_bangunan, sumber_air, sanitasi_wc, listrik, penerima_bansos, link_gmaps, latitude, longitude, created_at, foto_kk, jenis_bansos) FROM stdin;
2	3277021911061049	7	Komplek Nusa Cisangkan Permai Blok H No. 32	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.276164	\N	\N
3	3277022004210007	7	Komplek Nusa Cisangkan Permai Blok H No. 31	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.278524	\N	\N
4	3277021803110008	2	Jl. KH. Usman Dhomiri No. 30	Menumpang	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/bj8y9PbJDvY2Hx2y5	-6.87145910	107.53410700	2026-03-08 17:47:12.280981	\N	\N
7	3277012211160014	1	JL. KH Usman Dhomiri Gg. Bakti I	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.290099	\N	\N
8	3277022111060942	1	JL. KH Usman Dhomiri Gg. Bakti I	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.292833	\N	\N
10	3277020911061610	2	Jl. Kh. Usman Dhomiri No. 30	Kontrak/Sewa	3	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	https://maps.app.goo.gl/PLZqqqs1L8vkC6RZA	-6.87125200	107.53391100	2026-03-08 17:47:12.302959	\N	\N
11	3277022211060204	4	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-08 17:47:12.305242	\N	\N
12	3277022702190003	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.308526	\N	\N
13	3277022910150013	4	JL. KH Usman Dhomiri No. 26	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.311681	\N	\N
14	3277020711190001	2	JL. KH Usman Dhomiri	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.314057	\N	\N
15	3277022603180019	2	JL. Kh. Usman Dhomiri No. 13c	Kontrak/Sewa	3	Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	f	https://maps.app.goo.gl/B71uWqjxeHCJ89fAA	-6.87172100	107.53407700	2026-03-08 17:47:12.317697	\N	\N
16	3277021406230007	4	Jl. Kh. Usman Dhomiri No. 30	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.3217	\N	\N
17	3273062003130008	4	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.32447	\N	\N
18	3277022211060207	4	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.327062	\N	\N
19	3277022607230004	4	JL. KH Usman Dhomiri	Kontrak/Sewa	4	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.329803	\N	\N
20	3277020110190005	4	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.333381	\N	\N
21	3277021411060221	4	JL. KH Usman Dhomiri	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.336447	\N	\N
22	3277021106070080	2	JL. KH Usman Dhomiri	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.339541	\N	\N
23	3277022211060174	4	JL. KH Usman Dhomiri	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.3426	\N	\N
24	3277022211060187	4	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.346125	\N	\N
25	3277022211060183	4	Jl. Kh. Usman Dhomiri	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.349517	\N	\N
26	3277020802210008	4	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.352754	\N	\N
27	3277022111062542	4	Jl. Cisangkan Hilir No. 4	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.355582	\N	\N
28	3277021109250010	4	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Semi Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.360535	\N	\N
29	3277022305230009	4	JL. KH Usman Dhomiri	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.364922	\N	\N
30	3277021712080002	2	Jl. Kh. Usman Dhomiri No. 30	Milik Sendiri	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.36893	\N	\N
31	3277021911060546	1	Jl. Cisangkan Hilir no 22	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/Lb1y3mjkYF8ViMaDA	-6.87112400	107.53458000	2026-03-08 17:47:12.371833	\N	\N
33	3277020406130126	3	JL. KH Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/Q9ZXWnZo1v9ZQGE36	-6.87220600	107.53329000	2026-03-08 17:47:12.377821	\N	\N
34	3277021908110001	3	JL. KH Usman Dhomiri	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	https://maps.app.goo.gl/KvgsCG2NtxjtFcjK7	-6.87198730	107.53285190	2026-03-08 17:47:12.38018	\N	\N
35	3277022202080048	2	JL. KH Usman Dhomiri Gg. Bakti II No. 34 B	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/wNqV8RvgAT6zuUJa8	-6.87134410	107.53329960	2026-03-08 17:47:12.383144	\N	\N
36	3277021811061670	2	JL. KH Usman Dhomiri Gg. Bakti Baru I No. 16	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/bqootEsJXrPG8iet8	-6.87173500	107.53446600	2026-03-08 17:47:12.385669	\N	\N
37	3277020707140001	4	JL. Cisangkan Hilir No. 03	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/aRApzChm8abXLRC2A	-6.87243100	107.53168800	2026-03-08 17:47:12.388548	\N	\N
38	3277020402110001	1	JL. KH Usman Dhomiri Gg. Bakti I No. 20	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/PyDUM4VKq4T8h2Uv5	-6.87097670	107.53449360	2026-03-08 17:47:12.390735	\N	\N
40	3277022011060593	5	Komplek Nusa Cisangkan Permai Blok B No. 17	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	https://maps.app.goo.gl/1ws63u2G28Z5jmHVA	-6.87224800	107.53521400	2026-03-08 17:47:12.396425	\N	\N
41	3277022211060195	4	JL. Cisangkan Hilir	Milik Sendiri	7	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.400074	\N	\N
9	3277021811061910	2	Jl. Kh. Usman Dhomiri No. 30	Milik Sendiri	3	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/kqFjFGLZH7r7X7Bs7	-6.87131200	107.53397100	2026-03-08 17:47:12.299503	\N	PKH
43	3277021911060783	1	JL. KH Usman Dhomiri Gg. Bakti I No. 25	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.406376	\N	\N
6	3277021703070016	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 15 A	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/u5iu3e8yfkrgR7pk8	-6.87174300	107.53405900	2026-03-08 17:47:12.286921	/uploads/kk/1773017782508-asijhxlbobw.jpeg	\N
42	3277022411060033	6	Komplek Nusa Cisangkan Permai Blok F No. 8	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.402608	/uploads/kk/1773302836485-qk71kcsewcf.jpeg	\N
32	3277022904210004	6	Komplek Nusa Cisangkan Permai Blok H	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.374547	/uploads/kk/1773305333984-62ucsyt6gum.jpeg	\N
44	3277021103120009	1	JL. KH Usman Dhomiri No.23	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.408972	\N	\N
45	3277021911060447	1	JL. KH Usman Dhomiri Gg. Bakti I No. 6 B	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.411702	\N	\N
46	3277022311060365	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/Zw9Ga749L4o8jb4F7	-6.87181500	107.53418000	2026-03-08 17:47:12.414123	\N	\N
47	3273101803200004	3	JL. KH Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.417871	\N	\N
48	3277022311060297	3	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.420772	\N	\N
49	3277022311060184	3	Jl.KH Usman dhomiri RT003/RW003 gang bakti III	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.423501	\N	\N
50	3277021410210009	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.426301	\N	\N
51	3277022311060278	3	Jl. Kh. Usman Dhomiri No. 42	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.429577	\N	\N
52	3277022708210015	3	JL KH USMAN DHOMIRI RT003/RW003 GANG BAKTI III	Menumpang	1	Permanen	Sumur Bor	Jamban Bersama	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.432347	\N	\N
53	3277022912100009	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.435248	\N	\N
54	3217130902210008	3	JL KH USMAN DHOMIRI RT 003/RW003 GANG BAKTI III	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.437944	\N	\N
55	3277022311060352	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Semi Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.441132	\N	\N
56	3277021811061845	2	JL. KH Usman Dhomiri No. 18	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/pNJfJvpNRs8SttPe8	-6.87196000	107.53390900	2026-03-08 17:47:12.444363	\N	\N
57	3277020502130004	2	JL. KH Usman Dhomiri No. 18	Menumpang	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/pNJfJvpNRs8SttPe8	-6.87196000	107.53390900	2026-03-08 17:47:12.446825	\N	\N
58	3277021911070001	2	JL. KH Usman Dhomiri No. 18 A	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/a3ptLBhtJYkmD9fE7	-6.87197100	107.53394100	2026-03-08 17:47:12.449627	\N	\N
59	3277021811061903	2	JL. KH Usman Dhomiri No. 30	Milik Sendiri	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.452549	\N	\N
60	3277022002180005	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.455082	\N	\N
61	3277021811061788	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 15 B	Milik Sendiri	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	t	https://maps.app.goo.gl/ts8Bi9ohmYLCiTDn9	-6.87177900	107.53412600	2026-03-08 17:47:12.45968	\N	\N
62	3277022311060359	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.465183	\N	\N
63	3277022212100014	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Milik Sendiri	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/NXgyxj56aYimTa4SA	-6.87168300	107.53399300	2026-03-08 17:47:12.474411	\N	\N
64	3277020907210023	3	Jl. Kh. Usman Dhomiri	Menumpang	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.478943	\N	\N
65	3277021009080011	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.481997	\N	\N
66	3277022311060316	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.485719	\N	\N
67	3277020810250006	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.48858	\N	\N
68	3277020105070014	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.492543	\N	\N
69	3277031203080021	3	Jl. Kh. USman Dhomiri Gg. Bakti III	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.496109	\N	\N
70	3277020811100005	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.498999	\N	\N
71	3205310901170002	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.505177	\N	\N
72	3277022406150016	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.508338	\N	\N
74	3309142811190002	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/jQBN7tfZjtCwa6qU8	-6.87181900	107.53418000	2026-03-08 17:47:12.520281	\N	\N
75	3201251007071357	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/jQBN7tfZjtCwa6qU8	-6.87181900	107.53418000	2026-03-08 17:47:12.525179	\N	\N
76	3277022409090132	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/jQBN7tfZjtCwa6qU8	-6.87181900	107.53418000	2026-03-08 17:47:12.528222	\N	\N
77	3277021311060973	2	JL. KH Usman Dhomiri Gg. Bakti Batu II NO. 18	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/RY3zSsfwpMG6JJEp7	-6.87168800	107.53410900	2026-03-08 17:47:12.530531	\N	\N
78	3277020605250002	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/Vt4sFtHWCyKkurbx5	-6.87181500	107.53415900	2026-03-08 17:47:12.533658	\N	\N
79	3277022111060327	2	JL. KH Usman  Dhomiri Gg. Bakti Baru II	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/Vt4sFtHWCyKkurbx5	-6.87181500	107.53415900	2026-03-08 17:47:12.537424	\N	\N
80	3277021608130003	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 C	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Bersama	PLN 900 VA	f	https://maps.app.goo.gl/5XgANAEuqcbBAHP37	-6.87171600	107.53408800	2026-03-08 17:47:12.540289	\N	\N
81	3277022005090049	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Menumpang	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	https://maps.app.goo.gl/3is8ddX3mjbuVK5g9	-6.87187600	107.53408200	2026-03-08 17:47:12.543018	\N	\N
82	3277022404140019	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/vT2zNfW14AN9tusq6	-6.87168200	107.53400200	2026-03-08 17:47:12.545861	\N	\N
83	3277021210170005	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 D	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/jUwSEZ4TeGU6hwGCA	-6.87178000	107.53418200	2026-03-08 17:47:12.548377	\N	\N
84	3277022903190001	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 G	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/1MEm3uxoAsRYJ7nW8	-6.87181900	107.53419000	2026-03-08 17:47:12.550909	\N	\N
85	3276023003160001	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 D	Menumpang	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/dh97VXFexsXyPqMp9	-6.87177000	107.53418200	2026-03-08 17:47:12.553531	\N	\N
86	3674060507220005	1	JL. KH Usman Dhomiri Gg. Bakti No. 7	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.558406	\N	\N
87	3674061303100242	1	JL. KH Usman Dhomiri Gg. Bakti No. 7	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.561132	\N	\N
88	3277022311060202	3	JL KH USMAN DHOMIRI RT 003/RW 003 GANG BAKTI III	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.56435	\N	\N
89	3277020412250009	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.566728	\N	\N
90	3277020309190007	3	Jl. Kh. Usman Dhomiri  Gg. Bakti III	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.568829	\N	\N
91	3277022812170012	3	JL KH USMAN DHOMIRI RT003/RW003	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.57165	\N	\N
92	3277020108160007	3	JL. KH Usman Dhomiri RT 03 RW 03 Gg. Bakti III	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.574738	\N	\N
93	3211183004120018	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.577739	\N	\N
94	3277021803070102	3	JL KH USMAN DHOMIRI RT003/RW003 GANG BAKTI III	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.580214	\N	\N
95	3277021811061695	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Bersama	PLN 900 VA	f	https://maps.app.goo.gl/zBngBVgiPoUyNUoU8	-6.87172500	107.53408500	2026-03-08 17:47:12.582908	\N	\N
96	3277022706110011	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.585559	\N	\N
97	3277022111060172	3	JL KH USMAN DHOMIRI RT 003 / RW 003 GANG BAKTI III	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.587883	\N	\N
98	3277021908069733	2	JL. KH Usman Dhomiri Gg. Bakti Baru II	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/xBmEVbtmRnYhKPtA9	-6.87182300	107.53418700	2026-03-08 17:47:12.5903	\N	\N
99	3277020206140030	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.593333	\N	\N
100	3277020903230005	3	JL KH USMAN DHOMIRI RT 003 / RW 003 GANG BAKTI III	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.597707	\N	\N
101	3277022308210008	3	JL KH USMAN DHOMIRI RT 003/RW 003 GANG BAKTI III	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.600729	\N	\N
102	3277022311060228	3	JL. KH Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.603599	\N	\N
103	3277022011170005	3	Jl. KH. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.606239	\N	\N
104	3277021508160021	3	JL KH USMAN DHOMIRI RT003/RW003 GANG BAKTI III	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.608986	\N	\N
105	3277021301140001	3	JL. KH Usman Dhomiri Gg. Bakti III	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.611784	\N	\N
106	3277020402210007	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	7	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.614726	\N	\N
107	3277021811061648	2	Jl. Kh. Usman Dhomiri No. 30E	Milik Sendiri	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/qfEfwFZzj9w3Yfwy6	-6.87133500	107.53401700	2026-03-08 17:47:12.619802	\N	\N
108	3277011609130038	2	Jl.Kh. Usman Dhomiri No. 38	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN > 2200 VA	f	https://maps.app.goo.gl/PQLXS1M9mBXFQbhC9	-6.87167860	107.53348370	2026-03-08 17:47:12.624021	\N	\N
109	3277023108140001	2	Jl. Kh. Usman Dhomiri No. 30	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/1SyyeWvaNxJNXN7Z6	-6.87132600	107.53403500	2026-03-08 17:47:12.628642	\N	\N
110	3277021101220009	2	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	https://maps.app.goo.gl/ujaPEre2H2NtVB7K8	-6.87173750	107.53368060	2026-03-08 17:47:12.63102	\N	\N
111	3376040503180004	2	Jl. Kh. Usman Dhomiri No. 17	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	https://maps.app.goo.gl/uZZzF494yyu96rK78	-6.87168010	107.53387830	2026-03-08 17:47:12.634522	\N	\N
112	3277020512130013	2	Jl. Kh. Usman Dhomiri No.32A	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	https://maps.app.goo.gl/LqtxjBo2RbGEiSaU9	-6.87145940	107.53385860	2026-03-08 17:47:12.637125	\N	\N
113	3277021604110021	2	Jl. Kh. Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/ssuG3Mmkb5UDaJ686	-6.87194200	107.53384800	2026-03-08 17:47:12.639666	\N	\N
114	3277022704230006	2	Jl.Kh. Usman Dhomiri No. 34A Gg. Bakti II	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/Ej7zX9SCPwpBPBJx6	-6.87133900	107.53369500	2026-03-08 17:47:12.645499	\N	\N
115	3277021811061751	2	JL KH USMAN DHOMIRI RT 02 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/JNiVujgCiSazXvHA8	-6.87157300	107.53389000	2026-03-08 17:47:12.650678	\N	\N
116	3277020903150002	2	JL. KH Usman Dhomiri No. 34	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/LMXLa6LT2qDxgExa9	-6.87158340	107.53353390	2026-03-08 17:47:12.653298	\N	\N
117	3277020504230006	2	JL KH USMAN DHOMIRI RT 02 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/JNiVujgCiSazXvHA8	-6.87157300	107.53389000	2026-03-08 17:47:12.655775	\N	\N
118	3277021811061839	2	Jl. Kh. Usman Dhomiri No. 36	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/bHqudszNnns2LYRn7	-6.87160440	107.53354600	2026-03-08 17:47:12.657901	\N	\N
119	3277021811061866	2	JL. KH Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/d6VwAwR2B5CTwDYk7	-6.87148800	107.53404200	2026-03-08 17:47:12.660791	\N	\N
120	3277020908070009	2	Jl. Kh. Usman Dhomiri No. 18	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/EuoNX5PFjyyuKg85A	-6.87172400	107.53376100	2026-03-08 17:47:12.663673	\N	\N
121	3277022512120003	2	JL. KH Usman Dhomiri	Menumpang	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/yEpuuyrVsHE9xGCD6	-6.87151400	107.53404500	2026-03-08 17:47:12.666443	\N	\N
122	3277022111062533	4	JL KH USMAN DHOMIRI NO 4 RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.668986	\N	\N
123	3277021812150005	4	Jl. Kh. Usman Dhomiri No. 4	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.671779	\N	\N
124	3277022211060170	4	JL KH USMAN DHOMIRI NO 3 RT04 RW 03	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.674996	\N	\N
125	3277021409160008	4	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.677759	\N	\N
126	3277020811060479	2	JL. KH Usman Dhomiri No. 38	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.680179	\N	\N
127	3217031406170002	4	JL KH USMAN DHOMIRI RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.683056	\N	\N
128	3277021011060141	4	Jl. Kh. Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.685332	\N	\N
129	3277022211210006	4	Jl. Kh. Usman Dhomiri	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.688553	\N	\N
130	3277022111062525	4	Jl. Kh. Usman Dhomiri No. 113	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.690956	\N	\N
131	3277021303250003	3	JL. KH Usman Dhomiri No. 32	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.694035	\N	\N
132	3277021612170001	3	JL. KH Usman Dhomiri	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.697907	\N	\N
133	3277022311060343	3	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.700605	\N	\N
134	3277022311230009	2	JL. KH Usman Dhomiri No. 9 A	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.702922	\N	\N
135	3277022211060172	4	JL KH USMAN DHOMIRI NO36 RT 04 RW 03 KEL PADASUKA	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.705853	\N	\N
136	3277021309180010	2	Jl. Kh. Usman Dhomiri Gg. Bakti Baru I	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.709554	\N	\N
137	3277022111062545	4	JL KH USMAN DHOMIRI RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.711727	\N	\N
138	3277021811061741	2	Jl. Kh. Usman Dhomiri No. 19	Kontrak/Sewa	4	Semi Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.714286	\N	\N
139	3328042101110363	2	Jl. Kh. Usman Dhomiri No. 11A/19 Gg. Karya Bakti Baru I	Kontrak/Sewa	3	Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.717279	\N	\N
140	3277021811150027	4	JL KH USMAN DHOMIRI NO 7RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.71926	\N	\N
141	3217060806230003	2	Jl. Kh. Usman Dhomiri No.9	Milik Sendiri	1	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.722378	\N	\N
142	3277021811061587	2	Jl. Kh. Usman Dhomiri Gg. Bakti Baru I No. 13	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/DGqA7MgyjRKrauwK9	-6.87164460	107.53427660	2026-03-08 17:47:12.724565	\N	\N
143	3277021210210002	4	JL KH USMAN DHOMIRI NO36 RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.726865	\N	\N
144	3277022512100003	2	Jl. KH. Usman Dhomiri No.11E Gg. Bakti Baru I	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.729914	\N	\N
145	3277021902070004	2	Jl. Kh. Usman Dhomiri No.11D Gg. Bakti Baru I	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.732322	\N	\N
146	3277020506130032	4	JL CISANGKAN HILIR RT 04/RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.735595	\N	\N
147	3227702181106184	2	Jl.Kh. Usman Dhomiri No.15 Gg. Bakti Baru I	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.738488	\N	\N
148	3277021811061848	2	Jl. Kh. Usman Dhomiri No. 15 Gg. Bakti Baru I	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.740864	\N	\N
149	3277021811140005	4	JL KH USMAN DHOMIRI RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.743074	\N	\N
150	3277022808250006	2	Jl. Kh. Usman No. 16 Gg. Bakti Baru I	Menumpang	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.745895	\N	\N
151	3277021811061921	2	JL. KH Usman Dhomiri Gg. Bakti Baru I	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.748361	\N	\N
152	3277025012660040	4	JL KH USMAN DHOMIRI RT04 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.750984	\N	\N
153	1207231007170026	4	JL KH USMAN DHOMIRI RT04RW03KEL PADASUKA KEC CIMAHI TENGAH	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.753378	\N	\N
154	3277020711190007	2	Mochmad Ervin	Kontrak/Sewa	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.755237	\N	\N
155	3277021811061914	2	JL. KH Usman Dhomiri Gg. Bakti Baru I	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.757879	\N	\N
156	3277021907220005	4	JL KH USMAN DHOMIRI RT04RW03 KEL PADASUKA KEC CIMAHI TENGAH	Kontrak/Sewa	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.760544	\N	\N
157	3277021807130015	2	Jl. Kh. usman Dhomiri No. 11D Gg. Bakti Baru I	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.76297	\N	\N
158	3277022108180011	2	Jl. KH Usman Dhomiri Gg. Bakti Baru I No. 11 D	Kontrak/Sewa	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.765267	\N	\N
159	3277020708230009	2	Jl. Kh. Usman Dhomiri No.15 Gg. Bakti Baru I	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.767986	\N	\N
160	3277022301140015	4	JL KH USMAN DHOMIRI RT 04 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.770292	\N	\N
161	3277022603210006	2	Jl. Kh. Usman Dhomiri Gg. Bakti Baru I	Milik Sendiri	3	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.773065	\N	\N
162	3277021703070018	2	JL. KH Usman Dhomiri Gg. Bakti Baru I No. 11 F	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/NTgcngoNgAKKitCQ6	-6.87175200	107.53446300	2026-03-08 17:47:12.776801	\N	\N
163	3209070910120011	2	JL. KH Usman Dhomiri Gg. Bakti Baru I	Kontrak/Sewa	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.844939	\N	\N
164	3277022011140002	5	Komp. Nusa Cisangkan PermaiNo. A 4	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.847958	\N	\N
165	3277022011061567	5	Komp. Nusa Cisangkan Permai Blok B No.23	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.850635	\N	\N
166	3277021708068862	5	Komp. Nusa Cisangkan Permai Blok B No. 11	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.852922	\N	\N
167	3277021903070042	5	Komp. Nusa Cisangkan Permai Blok No. 1 (Ruko)	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.856098	\N	\N
168	3277022111070008	5	Komplek Nusa Cisangkan Permai No. D 3	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.858951	\N	\N
169	3277022011061178	5	Komp . Nusa Cisangkan Permai Blok C No. 21	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.861715	\N	\N
170	3277021402170005	5	Komp. Nusa Cisangkan Permai Blok B21	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.864767	\N	\N
171	3277022605080009	5	Komp. Nusa Cisangkan Permai Blok C nO. 5	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.868043	\N	\N
172	3277021808210005	5	Komp. Nusa Cisangkan Permai Blok C No. 15	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.871202	\N	\N
173	3277020606220008	5	Komp. Nusa Cisangkan Permai Blok B No. 24	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.873247	\N	\N
174	3277021503321000	5	Nusa Cisangkan Permai Blok B No. 7	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.875266	\N	\N
175	3277022011061294	5	Komp Nusa Cisangkan Permai Blok B No.7	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.87818	\N	\N
176	3277020906220004	5	Nusa Cisangkan Permai Blok A No. 7	Milik Sendiri	1	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.880182	\N	\N
177	3277020908160001	1	JL. KH Usman Dhomiri Gg. Bakti I No 12 B	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.882624	\N	\N
178	3277022808200011	1	JL. KH Usman Dhomiri No. 18	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	t	\N	\N	\N	2026-03-08 17:47:12.885319	\N	\N
179	3277021911060421	1	JL. KH Usman Dhomiri Gg. Bakti I No. 9	Milik Sendiri	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-08 17:47:12.887761	\N	\N
180	3277020504110008	1	JL. KH Usman Dhomiri Gg. Bakti I No. 4 A	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.890979	\N	\N
181	3277020505210007	1	JL. KH Usman Dhomiri Gg. Bakti I No. 4 A	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:12.893701	\N	\N
182	3277022601160009	1	JL. KH Usman Dhomiri Gg. Bakti I No. 2	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/G4WxWRBGGi1Ud7jM8	-6.87086860	107.53467970	2026-03-08 17:47:12.896639	\N	\N
183	3277021601140014	1	JL. KH Usman Dhomiri Gg. Bakti I	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.899878	\N	\N
184	3277020706070009	1	JL. KH Usman Dhomiri Gg. Bakti I	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.902705	\N	\N
185	3277021911060453	1	JL. KH Usman Dhomiri Gg. Bakti I No. 24	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.905225	\N	\N
186	3277021911060424	1	JL. KH Usman Dhomiri Gg. Bakti I No. 1 A	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.907196	\N	\N
187	3277022311060326	3	JL KH USMAN DHOMIRI RT03/RW03	Menumpang	2	Non Permanen	Lainnya	Jamban Bersama	Tidak Ada	f	\N	\N	\N	2026-03-08 17:47:12.910013	\N	\N
188	3277022205110022	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.912151	\N	\N
189	3277022202080045	3	JL KH USMAN DHOMIRI RT03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Semi Permanen	Sumur Gali	Jamban Bersama	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.914834	\N	\N
190	3277022311060356	3	JL KH USMAN DHOMIRI RT03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.917169	\N	\N
191	3277022209230010	3	JL KH USMAN DHOMIRI RT03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	3	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.922398	\N	\N
192	3277021503210007	5	Komp. Nusa Cisangkan Permai Blok B No. 7	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.924462	\N	\N
193	3214020905230004	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	3	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.927148	\N	\N
194	3277021404230004	5	Komplek Nusa Cisangkan Permai Blok D No. 9	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.929219	\N	\N
195	3277022212760006	3	JL KH USMAN DHOMIRI RT03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Permanen	Lainnya	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.931803	\N	\N
196	3277022311060229	3	JL KH USMAN DHOMIRI RT03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	4	Permanen	Lainnya	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.934448	\N	\N
197	3277020405230015	4	Jl. Kh. Usman Dhomiri	Menumpang	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.939561	\N	\N
198	3277022208080010	1	JL. KH Usman Dhomiri No. 24	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-08 17:47:12.942298	\N	\N
199	3277021911060468	1	JL. KH Usman Dhomiri Gg. Bakti I	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:12.94566	\N	\N
200	3277021911060464	1	JL. KH Usman Dhomiri Gg. Bakti I No. 6	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.948388	\N	\N
201	3277022209250008	1	JL. KH Usman Dhomiri Gg. Bakti I No. 26	Kontrak/Sewa	3	Semi Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.952613	\N	\N
202	3277020606080004	1	JL. KH Usman Dhomiri Gg. Bakti i No. 6	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.959493	\N	\N
203	3277020703250003	1	JL. KH Usman Dhomiri Gg. Bakti I No. 19	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.962159	\N	\N
204	3277021004140011	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.965679	\N	\N
205	3273032312120042	3	JL KH USMAN DHOMIRI GG BAKTI III KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.974109	\N	\N
206	3277021507200003	3	JL KH USMAN DHOMIRI RT 003 RW 003  KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.978422	\N	\N
207	3277020409250005	3	Jl. Kh. Usman Dhomiri Gg. Bakti 3 No.37	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.983872	\N	\N
208	3277022311060312	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:12.987546	\N	\N
209	3277021603070113	1	JL. Kh. Usman Dhomiri	Menumpang	1	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:12.993984	\N	\N
210	3277022808180003	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:12.997535	\N	\N
211	3277021811061604	1	Jl. Kh. Usman Dhomiri No.7	Menumpang	5	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.000578	\N	\N
212	3277022311060285	3	JL. KH Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.003256	\N	\N
213	3277022311060269	3	JL KH USMAN DHOMIRI GGBAKTI III RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.007969	\N	\N
214	3277030605210002	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 37	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.011683	\N	\N
215	3277022311060340	3	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.017052	\N	\N
216	3277021806140012	3	Jl. Kh. Usman Dhomiri	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.023588	\N	\N
217	3277020911220004	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.027112	\N	\N
218	3107090410210008	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 29	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.029839	\N	\N
219	3217090410210008	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 29	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.032724	\N	\N
220	3277022311060165	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.035573	\N	\N
221	3277021406230004	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 42	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.038246	\N	\N
222	3277022311060164	3	Jl. Kh. Usma Dhomiri Gg. Bakti	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.041038	\N	\N
223	3217070907070021	2	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.043724	\N	\N
224	3277022310200003	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Menumpang	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.046665	\N	\N
225	3277020403250012	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.049085	\N	\N
226	3277010612180021	3	Jl. Kh. USman Dhomiri Gg. Bakti III	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.051945	\N	\N
227	3277010612180016	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.054779	\N	\N
228	3277022311060380	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.057999	\N	\N
229	3277021901220017	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.0606	\N	\N
230	3277022107230005	3	Jl. Kh. Sman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.063872	\N	\N
231	3277022311060119	3	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:13.067244	\N	\N
232	3277021908190002	3	Jl. Kh. Usman Dhomiri No. 50	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.070302	\N	\N
233	3277021807240004	3	Jln. Kh. Usman Dhomiri	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.075392	\N	\N
234	3277021510240002	3	Jln. Kh. Usman dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.077932	\N	\N
235	3277022311060394	3	Jln. Usman dhomiri	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.081129	\N	\N
236	3277020910140015	3	Jln. Usman dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.084973	\N	\N
237	3277022311060172	3	Jln. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.088248	\N	\N
238	3277021805210017	3	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.091522	\N	\N
239	3217030205050722	1	JL. KH Usman Dhomiri	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:13.09789	\N	\N
240	3277022211110004	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.104371	\N	\N
241	3277021911060521	1	JL. KH Usman Dhomiri Gg. Bakti I No. 3	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.109152	\N	\N
242	3277020401070008	2	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.111973	\N	\N
243	3277022201260001	3	JL KH USMAN DHOMIRI NO 33	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.11536	\N	\N
244	3277021001250014	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.118935	\N	\N
245	3277022311060161	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.121399	\N	\N
246	3277020504110003	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 31	Menumpang	5	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:13.123891	\N	\N
247	3277021601170003	3	JL KH USMAN DHOMIRI  RT 03 RW03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	Tidak Ada	f	\N	\N	\N	2026-03-08 17:47:13.126945	\N	\N
248	3277022403150006	1	JL. KH Usman Dhomiri Gg. Bakti I No. 26	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:13.129169	\N	\N
249	3277020904190018	3	JL KH USMAN DHOMIRI NO 17 F KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.131598	\N	\N
250	3277020312150004	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.134042	\N	\N
251	3277022104160021	3	JL KH USMAN DHOMIRI NO 17 F RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.137858	\N	\N
252	3217041001230009	2	JL KH USMAN DHOMIRI NO RT 02 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-08 17:47:13.140205	\N	\N
253	3277022311060157	3	Jl. Kh. Usman Dhomiri Gg. Bakti III	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.142572	\N	\N
254	3277022611250004	1	JL. KH Usman Dhomiri	Menumpang	4	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.145129	\N	\N
255	3277020906140004	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.147933	\N	\N
256	3277021401210015	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.150527	\N	\N
257	3277022311060168	3	Jl. Kh. Usman Dhomiri Gg. Bakti III No. 32	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.153687	\N	\N
258	3277022310190005	3	JL KH USMAN DHOMIRI NO 43	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.158601	\N	\N
259	3277021111061278	3	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.162343	\N	\N
260	3277011110060183	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.16545	\N	\N
261	3277020602140036	1	JL. KH Usman Dhomiri	Menumpang	4	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.170791	\N	\N
262	3277022211060659	3	Jl. Kh. Usman Dhomiri	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.174312	\N	\N
263	3217061602210021	1	JL. KH Usman Dhomiri No. 10	Kontrak/Sewa	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.177789	\N	\N
264	3277020803100047	3	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.180211	\N	\N
265	3277021811061779	1	JL. KH Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.183107	\N	\N
266	3277022507190006	1	JL. KH Usman Dhomiri No. 07	Menumpang	3	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.185825	\N	\N
267	3277021911060692	1	JL. KH Usman Dhomiri No. 7	Menumpang	2	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.188738	\N	\N
268	3277022408210013	1	JL. KH Usman Dhomiri	Menumpang	2	Semi Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.191228	\N	\N
269	3277021811061685	1	JL. KH Usman Dhomiri	Menumpang	3	Semi Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.194073	\N	\N
270	3277020907210021	1	JL. KH Usman Dhomiri	Menumpang	2	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.196586	\N	\N
271	3277021603070114	1	JL. KH Usman Dhomiri No. 7	Menumpang	5	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.199952	\N	\N
272	3204351605050032	3	JL KH USMAN DHOMIRI KEL PADASUKA KEC CIMAHI TENGAH	Kontrak/Sewa	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.202374	\N	\N
275	3217062212210015	3	JL KHUSMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.210813	\N	\N
279	3277022311060242	3	JL KH USMAN DHOMIRI RT 03 RW 03 KEL PADASUKA KEC CIMAHI TENGAH	Kontrak/Sewa	4	Semi Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.220948	\N	\N
282	3277021810170018	3	JL. KH Usman Dhomiri	Kontrak/Sewa	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-08 17:47:13.227809	\N	\N
283	3277020805240001	3	JL. KHUsman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.230898	\N	\N
284	3277022311060215	3	JL. KH Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.233301	\N	\N
285	3277022701150006	3	JL. KH Usman Dhomiri	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:13.23635	\N	\N
286	3277022311060319	3	JL. KH Usman Dhomiri	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:13.23887	\N	\N
287	3277021108110002	3	JL. KH Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:13.241895	\N	\N
288	3277022606130027	3	JL. KH Usman Dhomiri No. 17	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-08 17:47:13.244302	\N	\N
289	3273150704210011	3	JL. KH Usman Dhomiri	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.247198	\N	\N
290	3277020806230011	4	JL. KH Usman Dhomiri	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.250825	\N	\N
291	3277020703080001	4	JL. KH Usman Dhomiri  No. 173	Milik Sendiri	1	Semi Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-08 17:47:13.253905	\N	\N
73	3277021108160014	3	Jl. KH. Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	https://maps.app.goo.gl/sEjggLLMHGLxibar5	-6.87225570	107.53360560	2026-03-08 17:47:12.514205	/uploads/kk/1773008681830-dreol3bhin.jpg	\N
325	3277020904160006	1	JL. KH Usman Dhomiri  No. 5/685	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-09 00:57:17.173003	\N	\N
5	3277022808180004	2	JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	https://maps.app.goo.gl/NBxnsSvtF7guV3dGA	-6.87181800	107.53418500	2026-03-08 17:47:12.284185	/uploads/kk/1773014083547-wy67yvmqk5.jpeg	\N
372	3273092108101725	6	NUSA CISANGKAN PERMAI BLOK E NO . 17	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 08:39:41.422082	\N	\N
373	3277022011060450	6	Nusa Cisangkan Permai blok F No. 2	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 08:56:38.759849	\N	\N
276	3277020203230003	6	Komplek Nusa Cisangkan Permai Blok D No. 24	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.213332	/uploads/kk/1773303666760-ohgcjvpkq5.jpeg	\N
277	3277020801240010	6	Komplek Nusa Cisangkan Permai Blok D No. 24	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.215897	/uploads/kk/1773304615200-nnslqqlqy1.jpeg	\N
273	3277021201070017	6	Komplek Nusa Cisangkan Permai Blok D No. 24	Milik Sendiri	1	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.204824	/uploads/kk/1773305266555-1lf1l3u8yz2.jpeg	\N
374	3273041008170017	6	Nusa Cisangkan Permai Blok E  No. 16	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 07:21:48.62285	/uploads/kk/1773388855822-0wcoveaxmmn.jpeg	\N
370	3277021111062161	6	NUSA CISANGKAN PERMAI BLOK E NO.19	Menumpang	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 08:24:42.468117	/uploads/kk/1773388904827-v1wkxu6sqi.jpeg	\N
281	3277020612100001	6	Perum Nusa Cisangkan Permai Blok D No. 26	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.225619	/uploads/kk/1773389456921-aq2trc8d7k8.jpeg	\N
1	3277022211060211	4	Jln Kh Ushman dhomiri no 48A	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	https://www.google.com/maps/place/4GGM%2BR3W+dapur+bunda+yoel's,+Jl.+Kyai+H.+Usman+Dhomiri,+Padasuka,+Kec.+Cimahi+Tengah,+Kota+Cimahi,+Jawa+Barat+40526/@-6.8729249,107.5327072,20z/data=!4m6!3m5!1s0x2e68e5e8143a763f:0x599c09052e4e573e!8m2!3d-6.8728996!4d107.5327186!16s%2Fg%2F11r9b3cb84?utm_campaign=ml-sbr&g_ep=Eg1tbF8yMDI2MDIwNF8wIOC7DCoASAJQAg%3D%3D	-6.87292490	107.53270720	2026-03-08 17:47:12.271794	/uploads/kk/1773024301303-papq1esfsff.pdf	\N
326	3277021209240004	1	JL. KH Usman Dhomiri	Menumpang	2	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	f	\N	\N	\N	2026-03-09 04:46:14.03592	\N	\N
327	3277021501100204	6	Komplek Nusa Cisangkan Permai Blok F No. 11	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-09 05:55:51.863919	\N	\N
422	3277021911060538	1	Jl. Cisangkan Hilir No. 3 Gg. Bakti Baru I	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-13 07:29:36.451363	\N	BST, PKH, PIP
329	3277022011060364	6	Nusa Cisangkan Permai Blok E No. 24	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 07:11:54.224891	/uploads/kk/1773040325546-dgds5lpkfit.jpg	\N
328	3277022011060704	6	PERUM NUSA CISANGKAN PERMAI BLOK D NO 27	Milik Sendiri	7	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 07:11:53.033776	/uploads/kk/1773389714622-wznx4tf9ado.jpeg	\N
331	3277022011060478	6	Komplek Nusa Cisangkan Permai Blok E No. 27	Menumpang	7	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 07:31:48.164602	\N	\N
332	3277021912180008	6	Komplek Nusa Cisangkan Permai  Blok E No. 23	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 07:36:59.178584	\N	\N
330	3277021706200005	6	PERUM NUSA CISANGKAN PERMAI NO D . 26	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-09 07:27:31.805081	/uploads/kk/1773303885042-jucfcikhfh.jpeg	\N
335	3277022011060424	6	Komplek Nusa Cisangkan Permai Blok F No. 12	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-09 08:12:56.330789	\N	\N
336	3277022011060474	6	Nusa Cisangkan Permai Blok E No. 22	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-09 08:14:46.375636	\N	\N
337	3277022908170014	6	NUSA CISANGKAN PERMAIN BLOK E. NO .21	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:16:18.46467	\N	\N
338	3277022512100005	6	Komplek Nusa Cisangkan Permai Blok F N0. 12	Menumpang	6	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-09 08:20:09.634214	\N	\N
339	3277022801080010	6	NUSA CISANGKAN PERMAI BLOK E NO.21	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:22:17.691639	\N	\N
340	32770216122080012	6	Nusa Cisangkan Permai Blok D No. 28	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:22:41.892489	\N	\N
344	3277022309150014	6	NUSA CISANGKAN PERMAI BLOK E NO . 19	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-09 08:29:03.301284	\N	\N
345	3277022505210011	6	NUSA CISANGKAN PERMAI BLOK E NO 12 A	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:34:35.711165	\N	\N
334	3277021505080004	7	Komplek Nusa Cisangkan Permai Blok G No. 10	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 07:58:53.579429	\N	\N
346	3277022505210004	4	JL. KH Usman Dhomiri No. 05	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 14:11:15.056539	\N	\N
347	3277021101140005	4	JL. KH Usman Dhomiri	Milik Sendiri	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-10 04:28:10.071375	\N	BPNT/Sembako, Lainnya
348	3277020207150025	4	JL. KH Usman Dhomiri 31/35	Menumpang	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 04:32:09.967424	\N	\N
349	3277021803190015	4	JL. KH Usman Dhomiri	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-10 04:35:30.488701	\N	PBI-JKN
350	3277022211060209	4	JL. KH Usman Dhomiri	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-10 04:40:55.552352	\N	\N
351	3277022111061252	4	JL. KH Usman Dhomiri	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 04:47:08.159596	\N	\N
352	3277022403250001	4	JL. KH Usman Dhomiri	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 04:53:24.160505	\N	\N
353	3277020209130002	4	JL. KH Usman Dhomiri	Menumpang	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 05:00:36.821462	\N	\N
356	3277020404110005	6	NUSA CISANGKAN PERMAI BLOK E NO.11	Milik Sendiri	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 07:18:48.488325	\N	\N
357	3277021303180007	6	NUSA CISANGKAN PERMAI E NO.10	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:31:56.600605	\N	\N
358	3277020205080002	6	NUSA CISANGKAN PERMAI BLOK E NO.10	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:37:06.176998	\N	\N
360	3277020911060379	6	Komplek Nusa Cisangkan Permai Blok F No. 10	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:51:10.381036	\N	\N
364	3277021109110003	6	Nusa Cisangkan Permai Blok F No. 9	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 08:08:53.490385	\N	\N
365	3277022011060514	6	NUSA CISANGKAN PERMAI BLOK E NO.4	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 08:12:40.087012	\N	\N
367	3277022509140010	6	NUSA CISANGKAN PERMAI BLOK E NO.7	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-10 08:18:12.63963	\N	\N
368	3217151905140005	6	Komplek Nusa Cisangkan Permai Blok F No. 7	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 08:22:15.02841	\N	\N
369	3277021403190004	6	Komplek Nusa Cisangkan Permai Blok F No. 1	Milik Sendiri	1	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-10 08:23:37.613382	\N	\N
343	3277021612080012	6	Nusa Cisangkan Permai Blok D No. 28	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:26:56.525702	/uploads/kk/1773303945326-ih5lv9oile.jpeg	\N
342	3277020602090003	6	Nusa Cisangkan Permai Blok D No. 29	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:24:44.391187	/uploads/kk/1773304191872-ux4f27h5a5g.jpeg	\N
341	3277021904240012	6	Nusa Cisangkan Permai Blok D No. 28	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-09 08:23:55.482525	/uploads/kk/1773304939741-xsknpppc6ge.jpeg	\N
355	3277020611160003	6	Komplek Nusa Cisangkan Permai Blok D No. 30	Menumpang	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:13:15.075005	/uploads/kk/1773305761924-0slz9rh4673.jpeg	\N
362	3277021911080016	6	NUSA CISANGKAN PERMAI BLOK E NO.1	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 07:59:09.422125	/uploads/kk/1773306038922-sp6n8zzebc9.jpeg	\N
363	3277020903230002	6	NUSA CISANGKAN PERMAI BLOK E NO.3	Milik Sendiri	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-10 08:07:18.540903	/uploads/kk/1773306140460-qypsm6iael.jpeg	\N
375	3277020103070009	6	NUSA CISANGKAN PERMAI BLOK F NO.6	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-11 07:21:54.91872	\N	Lainnya
376	3277021805100076	6	Nusa Cisangkan Permai Blok F No. 6	Menumpang	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 07:22:47.73491	\N	\N
377	3277020611190005	6	Nusa Cisangkan Permai Blok F No. 3	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-11 07:23:42.163256	\N	\N
414	3277021601150004	1	Jl. Kh. Usman Dhomiri	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-12 08:37:09.858642	\N	\N
410	3277021902070003	1	JL KH USMAN DHOMIRI NO 10	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-12 08:06:21.022787	\N	\N
387	3277020212250005	1	JL. KH Usman Dhomiri	Menumpang	1	Semi Permanen	Sumur Gali	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-11 08:12:47.053088	/uploads/kk/1773217521830-cf9ghtx9yoj.pdf	PBI-JKN
393	3277022309250002	1	JL. KH Usman Dhomiri	Kontrak/Sewa	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:38:38.875391	/uploads/kk/1773218319452-0u7izs0d012f.pdf	\N
395	3277020704080017	6	Nusa Cisangkan Permai Blok H No. 7	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:42:12.243648	/uploads/kk/1773388791673-k7f3z0ry7r8.jpeg	\N
278	3277020211090114	4	JL. KH Usman Dhomiri	Kontrak/Sewa	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.218303	\N	\N
404	317405080109804	4	JL. KH  Usman Dhomiri No. 9	Menumpang	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-12 05:16:27.827125	\N	\N
405	3277021909160028	4	JL. KH Usman Dhomiri No. 14/46 A	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-12 05:24:52.07211	\N	\N
406	3277022004170012	4	JL. KH Usman Dhomiri	Kontrak/Sewa	6	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-12 05:34:20.171902	\N	BPNT/Sembako, Lainnya
407	3277022211060186	4	JL. KH Usman Dhomiri	Milik Sendiri	5	Permanen	Sumur Gali	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-12 05:42:53.783212	\N	\N
408	3277020107200017	1	Jl. Kh. Usman Dhomiri No. 9/10	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-12 07:54:11.927639	\N	\N
409	3277021405900005	1	JL CISANGKAN HILIR	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-12 07:56:11.780949	\N	\N
394	3277023007180018	6	NUSA CISANGKAN PERMAI BLOK H NO.9	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:39:14.005868	/uploads/kk/1773303305601-plxrh667gs.jpeg	\N
384	3277021903070050	6	NUSA CISANGKAN PERMAI BLOK H NO.12	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:04:34.488164	/uploads/kk/1773303042186-os8xlo6hr0q.jpeg	\N
354	3277021908068574	6	Komplek Nusa Cisangkan Permai Blok D No. 30	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:12:14.249655	/uploads/kk/1773303104127-bo2upr2bn64.jpeg	\N
411	3277022202160005	1	JL KH USMAN DHOMIRI NO 9/10	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-12 08:12:49.912071	\N	\N
412	3277022905070006	1	Jl. Kh. Usman Dhomiri No. 9/10	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-12 08:13:20.800477	\N	\N
280	3277022011060415	6	Perum Nusa Cisangkan Permai	Milik Sendiri	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:13.223353	/uploads/kk/1773303527117-a4i1a2wu4hw.jpeg	\N
381	3277022011060463	6	Nusa Cisangkan Permai Blok H No.16	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 07:49:25.909353	/uploads/kk/1773303262209-mpvx6ibpix.jpeg	\N
415	3277021812230004	1	Jl. Cisangkan Hilir Gg. Bhakti I No. 10	Kontrak/Sewa	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-12 08:45:04.332164	\N	\N
392	32770217042050006	6	NUSA CISANGKAN PERMAI BLOK H NO.10	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:32:33.180682	/uploads/kk/1773303405113-ay3pxxlubb.jpeg	\N
386	3277022809160019	6	Nusa Cisangkan Permai Blok H No. 18	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:07:43.832543	/uploads/kk/1773303777885-zch8n396f4.jpeg	\N
400	3277020909130011	6	Nusa Cisangkan Permai Blok H No. 8	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 09:00:19.253872	/uploads/kk/1773303474058-dolh5vf821a.jpeg	\N
413	3277022310070033	1	Jl. Cisangkan Hilir No. 10	Kontrak/Sewa	4	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	f	\N	\N	\N	2026-03-12 08:26:00.077384	\N	\N
383	3277021606710009	6	NUSA CISANGKAN PERMAI BLOK H NO.14	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 07:54:50.906656	/uploads/kk/1773304124412-qiutha34xc.jpeg	\N
397	3277022504250007	6	Nusa Cisangkan Permai  Blok H No. 7	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:52:42.650601	/uploads/kk/1773304360808-e59mevwql39.jpeg	\N
380	3277022011060486	6	NUSA CISANGKAN PERMAI BLOK E NO.15	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-11 07:39:49.727499	/uploads/kk/1773304461134-nzaht2b6wld.jpeg	\N
403	3277021903070055	6	Nusa Cisangkan Permai Blok H No. 2	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 12:59:48.252456	/uploads/kk/1773304688808-u0f8ur1q6z.jpeg	\N
388	3277020307130015	6	NUSA CISANGKAN PERMAI BLOK H NO.11	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:16:07.623708	/uploads/kk/1773304866053-7eupivb92bi.jpeg	\N
390	3277022303540007	6	NUSA CISANGKAN PERMAI BLOK H NO.11	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:28:29.549499	/uploads/kk/1773305144813-pb3roi0rbpf.jpeg	\N
359	3277022011060370	6	NUSA CISANGKAN PERMAI BLOK E NO.2	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 07:44:56.731558	/uploads/kk/1773305409076-zu0ctg9bl4n.jpeg	\N
389	3277021609200002	6	NUSA CISANGKAN PERMAI BLOK H NO.11	Menumpang	4	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-11 08:20:37.08149	/uploads/kk/1773305514161-7euu8tcot6s.jpeg	\N
401	3277023103160004	6	Nusa Cisangkan Permai Blok H No. 3	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN > 2200 VA	f	\N	\N	\N	2026-03-11 12:44:34.484353	/uploads/kk/1773305636761-mbfjjuuno6m.jpeg	\N
378	3277031011090002	6	NUSA CISANGKAN PERMAI BLOK E NO.14	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 07:27:12.623389	/uploads/kk/1773389347586-zycjexfcwtg.jpeg	\N
391	3277021903070049	6	Nusa Cisangkan Permai Blok H No. 19	Milik Sendiri	6	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:31:15.841621	/uploads/kk/1773389621610-3c10z6palqj.jpeg	\N
396	3277021903070052	6	NUSA CISANGKAN PERMAI BLOK H NO.6	Milik Sendiri	5	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 08:47:17.438463	/uploads/kk/1773389693514-8fmjbqi7vje.jpeg	\N
382	3277022011060456	6	Nusa Cisangkan Permai Blok H No. 15	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 07:50:27.909535	/uploads/kk/1773305471409-398fbe5w6yh.jpeg	\N
417	3277020309180030	1	Jl. Kh. Usman Dhomiri Gg. Bhakti I	Milik Sendiri	4	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-12 08:52:49.7987	\N	BPNT/Sembako, PIP
371	3277021906250002	6	NUSA CISANGKAN PERMAI BLOK E NO. 17	Menumpang	2	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-10 08:34:58.340359	/uploads/kk/1773305573524-7b9k8opbucp.jpeg	\N
39	3277031011080010	6	Komplek Nusa Cisangkan Permai Blok H No. 17	Milik Sendiri	2	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-08 17:47:12.39335	/uploads/kk/1773305693723-uuq2t87m14q.jpeg	\N
418	3277021911060679	1	Jln. Cisangkan Hilir No. 3 Gg. Bhakti I	Menumpang	5	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	t	\N	\N	\N	2026-03-13 07:13:51.246551	\N	BPNT/Sembako, PKH, PIP
419	32770106010010	1	CISANGKAN HILIR GG BAKTI I	Milik Sendiri	4	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 07:15:46.830021	\N	\N
420	3273071802160001	1	Jl. Kh. Usman Dhomiri Gg. Bhakti I No. 7 	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-13 07:24:09.546177	\N	\N
421	3277021911060433	1	JL KH USMAN DHOMIRI GANG BAKTI I NO 14	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 07:25:50.494382	\N	\N
423	3277021703070004	1	JL KH USMAN DHOMIRI NO . 15	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 07:32:15.766373	\N	\N
424	3277021911060558	1	JL USMAN DHOMIRI NO.18	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-13 07:40:51.111577	\N	\N
425	3277021911060527	1	Jl. Kh. Usman Dhomiri No. 3 Gg. Bakti Baru I	Menumpang	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	t	\N	\N	\N	2026-03-13 07:46:41.259126	\N	BPNT/Sembako, PIP
426	3277021808200004	1	JL KH USMAN DHOMIRI NO.10	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-13 07:47:16.810593	\N	\N
427	3277012711080034	1	Jl. Cisangkan Hilir Gg. Bakti I No. 5	Milik Sendiri	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-13 07:53:25.271629	\N	BPNT/Sembako
428	3204092602140002	1	Jl. Kh. Usman Dhomiri No. 13 Gg. Bakti I	Menumpang	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 07:57:35.967808	\N	\N
429	3277021811061796	1	JL CISANGKAN HILIR NO .12	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-13 07:59:19.447809	\N	\N
431	3277021911060501	1	Jl. Kh. Usman Dhomiri No. 1 Gg. Bakti I	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 08:05:50.117766	\N	\N
361	3277021103200012	6	Komplek Nusa Cisangkan Permai Blok F No.9	Menumpang	3	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-10 07:52:40.68124	/uploads/kk/1773389381565-n9zgm14cwak.jpeg	\N
433	3277021911060470	1	JL CISANGKAN HILIR GG BAKTI I NO.6	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-13 08:11:09.996691	\N	\N
402	3277021812190009	6	Nusa Cisangkan Permai Blok H No. 2	Menumpang	4	Permanen	PDAM	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-11 12:52:12.687626	/uploads/kk/1773389580861-zyumc4sr7k.jpeg	\N
434	3277022304190001	1	Jl. Cisangkan Hilir No. 5/685	Milik Sendiri	4	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-13 08:13:51.361409	\N	\N
274	3277022206230006	6	Komplek Nusa Cisangkan Permai Blok D No. 24	Milik Sendiri	3	Permanen	PDAM	Jamban Sendiri	PLN 1300 VA	f	\N	\N	\N	2026-03-08 17:47:13.207836	/uploads/kk/1773389654421-n7khfodxtgm.jpeg	\N
435	3277022507180013	1	Jl. Kh. Usman Dhomiri No. 7	Menumpang	1	Semi Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	f	\N	\N	\N	2026-03-13 08:21:26.06318	\N	\N
436	3277020103210006	1	JL CISANGKAN HILIR NO 10	Menumpang	1	Permanen	Sumur Bor	Jamban Sendiri	PLN 2200 VA	f	\N	\N	\N	2026-03-13 08:22:48.483278	\N	\N
437	3277031206070076	1	Jl. Kh. Usman Dhomiri No. 20 Gg. Bakti I 	Milik Sendiri	1	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 08:25:12.588961	\N	\N
438	3277020508210005	1	JL. KH Usman Dhomiri	Menumpang	1	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	f	\N	\N	\N	2026-03-13 08:25:29.970579	/uploads/kk/1773390330674-k321scr4amf.pdf	\N
440	3277020902090014	1	Jl. Kh. Usman Dhomiri No.20	Milik Sendiri	2	Permanen	Sumur Gali	Jamban Sendiri	PLN 900 VA	t	\N	\N	\N	2026-03-13 08:28:08.921089	\N	BPNT/Sembako, PIP
441	3277021911060442	1	JL KH USMAN DHOMIRI GG BAKTI NO 16	Milik Sendiri	3	Permanen	Sumur Bor	Jamban Sendiri	PLN 900 VA	f	\N	\N	\N	2026-03-13 08:33:46.937348	\N	\N
443	3277021703070002	1	Jl. Cisangkan Hilir No.7	Menumpang	2	Permanen	Sumur Bor	Jamban Sendiri	PLN 450 VA	t	\N	\N	\N	2026-03-13 08:37:29.795445	\N	BPNT/Sembako
444	3277022104250007	1	Jl. Usman Dhomiri 	Menumpang	4	Semi Permanen	PDAM	Jamban Bersama	PLN 450 VA	f	\N	\N	\N	2026-03-13 08:42:54.946395	\N	\N
445	3277022510240009	1	JL KH USMAN DHOMIRI CISANGKAN HILIR DUSUN	Menumpang	5	Semi Permanen	Sumur Bor	Jamban Bersama	PLN 450 VA	t	\N	\N	\N	2026-03-13 08:44:34.143045	\N	PKH, PIP, BPNT/Sembako
\.


--
-- Data for Name: karyawan_usaha; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.karyawan_usaha (id, usaha_id, nama_lengkap, nik, alamat, nomor_whatsapp, jabatan, tanggal_mulai_kerja, created_at) FROM stdin;
\.


--
-- Data for Name: kas_rw; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kas_rw (id, tipe, kategori, jumlah, keterangan, tanggal, created_by, created_at, campaign_id) FROM stdin;
1	pemasukan	Iuran Warga	250000	RT 02	2026-02-28	radenraka	2026-03-11 00:55:51.302914	\N
2	pemasukan	Iuran Warga	250000	RT04	2026-02-28	radenraka	2026-03-11 00:56:15.489086	\N
3	pengeluaran	Keamanan	100000	Ronda Linmas	2026-03-10	radenraka	2026-03-11 01:12:49.929866	\N
4	pengeluaran	Keamanan	100000	Ronda Linmas	2026-03-07	radenraka	2026-03-11 01:39:20.0249	\N
5	pemasukan	Sumbangan	5000000	Yayasan Berkaria Foundation ke Masjid al Jihad	2026-03-11	radenraka	2026-03-11 01:41:00.202912	\N
6	pengeluaran	Lainnya	5000000	Penyerahan Kepada Masjid al Jihad	2026-03-11	radenraka	2026-03-11 01:41:35.883731	\N
7	pemasukan	Iuran Warga	300000	RT01	2026-03-11	radenraka	2026-03-11 09:22:03.334469	\N
8	pemasukan	Donasi	500000	Donasi: Donasi Sosial	2026-03-12	sistem	2026-03-12 09:51:09.598125	2
\.


--
-- Data for Name: laporan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.laporan (id, warga_id, kk_id, jenis_laporan, judul, isi, status, tanggapan_admin, created_at) FROM stdin;
1	16	1	keamanan	Laporan Kehilangan	saya kemalingan	selesai	akan kami laporkan ke polsek	2026-03-08 18:05:57.162446
2	16	1	keamanan	Laporan Kehilangan Helm	Saya Kehilangan Helm Jam 2 siang ini	selesai	Baik akan saya evaluasi	2026-03-09 02:55:39.916429
3	1060	354	umum	Kepengurusan DKM Al Jihad 2025 -2029	Saat ini Pembina td: Lurah, MUI Pdsuka, DMI Pdsuka, ketua RW 03, selama 1,5 tahun tidak berjalan efektif, kegiatan DKM tdk terpantau, buktinya khotib jumat dari da'i lokal tdk dilibatkan, pdhal selama ini mereka ikut berperan dalam membina jamaah, perlu diskusi dgn ketua RW selaku pembina Masjid Al Jihad, terima kasih	selesai	Baik Akan Segera Di Jadwalkan Pak Akhmad Syauqi🙏🏻	2026-03-10 12:06:26.524344
4	573	182	infrastruktur	Perbaikan jalan gang dan jalan umum	Agar jalan GG Bhakti 1 RT 01 di aspal supaya tidak terus2an rusak dan supaya di bangun gapura Gang  agar supaya kelihatan asri dan gagah wilayah RT 01 karena mempunyai gang yg bisa masuk mobil di banding jalan gang RT yg lain serta supaya area jalan depan yg sering kebanjiran saya punya dua alternatif masukan \n1..adanya pengerukan solokan dari batas RW 03 atas sampai bawah dekat SD pasukan\n2. Untuk menghindari air masuk ke jalan agar ditinggikan pondasi pinggir solokan dari batas RW 03 atas sampai area dekat SD PADASUKA\nDEMIKIAN \nHATURNUHUN🙏🙏	selesai	Siap Kami Akan Tampung pak, karena kebetulan RT01 kebetulan diajukan oleh pokmas nya hanya drainase di Program PPM ini maka saya harus mencari program lain seperti pokir dan lain lain. semoga saran bapak ini bisa cepat terrealisasikan	2026-03-11 16:27:57.697038
\.


--
-- Data for Name: monthly_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_snapshot (id, month, total_kk, total_warga, pengangguran, wa_registered, ktp_uploaded, kk_foto_uploaded, penerima_bansos, usaha_berizin, total_usaha, laporan_selesai, total_laporan, surat_selesai, total_surat, pemasukan, pengeluaran_snapshot, saldo, warga_singgah_aktif, indeks_kemajuan, created_at) FROM stdin;
1	2026-03	401	1313	77	891	12	51	75	0	0	4	4	42	42	6300000	5200000	1100000	0	42	2026-03-15 23:28:08.822785
\.


--
-- Data for Name: pemilik_kost; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pemilik_kost (id, nama_kost, nama_pemilik, nomor_wa_pemilik, rt, alamat_lengkap, jumlah_pintu, created_at) FROM stdin;
\.


--
-- Data for Name: pengajuan_bansos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pengajuan_bansos (id, kk_id, jenis_pengajuan, jenis_bansos, alasan, status, created_at) FROM stdin;
1	1	rekomendasi_penerima	PKH	karena kurang mampu	ditolak	2026-03-08 21:27:30.772853
\.


--
-- Data for Name: profile_edit_request; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profile_edit_request (id, warga_id, kk_id, field_changes, status, created_at) FROM stdin;
1	1	1	{"pekerjaan": "Engineer", "namaLengkap": "Test Name"}	disetujui	2026-03-08 18:09:32.188571
2	1	1	{"namaLengkap": "Buce Akhmad S"}	ditolak	2026-03-08 18:11:51.114338
3	1	1	{"pekerjaan": "Pegawai Negeri Sipil (PNS)"}	disetujui	2026-03-08 21:35:02.266547
4	1082	359	{"nomorWhatsapp": "0895619817050"}	disetujui	2026-03-10 09:24:05.09488
7	1340	441	{"namaLengkap": "DIDIN ROSIDIN"}	disetujui	2026-03-14 05:30:19.405362
6	765	240	{"nomorWhatsapp": "081905279136"}	disetujui	2026-03-13 22:59:55.228266
5	767	240	{"pendidikan": "Diploma IV/Strata I"}	disetujui	2026-03-13 22:59:09.159701
10	1023	344	{"pendidikan": "Tidak/Belum Tamat SD"}	disetujui	2026-03-14 12:11:51.010026
9	1021	344	{"pendidikan": "Diploma IV/Strata I"}	disetujui	2026-03-14 12:11:36.471547
8	1018	344	{"agama": "Kristen", "pendidikan": "Diploma IV/Strata I"}	disetujui	2026-03-14 12:11:24.771178
\.


--
-- Data for Name: riwayat_kontrak; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.riwayat_kontrak (id, warga_singgah_id, tanggal_mulai_lama, tanggal_habis_lama, tanggal_mulai_baru, tanggal_habis_baru, created_at) FROM stdin;
\.


--
-- Data for Name: riwayat_stiker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.riwayat_stiker (id, usaha_id, nomor_stiker, tanggal_terbit, tanggal_expired, created_at) FROM stdin;
\.


--
-- Data for Name: rt_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rt_data (id, nomor_rt, nama_ketua, nomor_whatsapp) FROM stdin;
1	1	Dadan Setiawan	
2	2	Jajang Kusmana	
3	3	Iyep Supriatna	
4	4	Eem Sulaeman	
5	5	Dadan Sobandi	
6	6	Dicky Irawan	
7	7	Abdul Muin	
\.


--
-- Data for Name: surat_rw; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surat_rw (id, jenis_surat, perihal, tujuan, isi_surat, tanggal_surat, created_at, nomor_surat) FROM stdin;
1	Surat Undangan	Undangan Rapat Pengkondisian zakat fitrah	Undangan Rapat	Nomor : 001/RW-03/SKRT/2026\nLampiran : -\nPerihal : Undangan Rapat Pengkondisian Zakat Fitrah\n\nCimahi, 25 Mei 2024\n\nYth. Bapak/Ibu/Saudara/i Undangan Rapat\nDi tempat\n\nDengan hormat,\n\nDalam rangka persiapan dan pengkondisian pelaksanaan zakat fitrah di lingkungan RW 03 Kelurahan Padasuka untuk tahun 1446 H/2025 M, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam rapat yang akan diselenggarakan pada:\n\nHari/Tanggal : Sabtu, 8 Juni 2024\nWaktu         : Pukul 19.30 WIB (Ba'da Isya)\nTempat        : Balai Pertemuan RW 03\n                Jl. Padasuka Indah No. 15, Cimahi Tengah\nAcara         : Pengkondisian dan Pembentukan Panitia Zakat Fitrah 1446 H/2025 M\n\nMengingat pentingnya acara ini, kami sangat mengharapkan kehadiran Bapak/Ibu/Saudara/i tepat waktu. Kehadiran dan kontribusi pemikiran Bapak/Ibu/Saudara/i akan sangat berarti bagi kelancaran dan kesuksesan pelaksanaan zakat fitrah di lingkungan kita.\n\nAtas perhatian dan kehadiran Bapak/Ibu/Saudara/i, kami ucapkan terima kasih.\n\nHormat kami,\n\nKetua RW 03\nKelurahan Padasuka\n\n(Tanda Tangan)\n\nRaden Raka	\N	2026-03-08 18:44:04.760348	001/SK-RW/RW-03/03/2026
2	Surat Permohonan Audiensi	Permohonan Penggunaan asset koni jabar di padasuka cimahi	KONI JAWA BARAT	Cimahi, 9 Maret 2026\n\nYth. Ketua Umum KONI Jawa Barat\ndi tempat\n\nPerihal: Permohonan Penggunaan asset koni jabar di padasuka cimahi\n\nDengan hormat,\n\nKami yang bertanda tangan di bawah ini, selaku perwakilan dari Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini mengajukan permohonan audiensi kepada Bapak/Ibu Ketua Umum KONI Jawa Barat.\n\nAdapun maksud dan tujuan permohonan audiensi ini adalah untuk menyampaikan rencana kegiatan peringatan Hari Ulang Tahun Kemerdekaan Republik Indonesia ke-79 (17 Agustus) yang akan diselenggarakan oleh RW 03 bersama Karang Taruna RW 03 Kelurahan Padasuka. Kami berencana untuk mengadakan acara peringatan 17 Agustus yang termegah di Cimahi.\n\nSehubungan dengan hal tersebut, kami sangat berharap dapat berdiskusi mengenai kemungkinan penggunaan aset milik KONI Jawa Barat yang berlokasi luas di wilayah Padasuka, khususnya di area RW 03 kami, sebagai lokasi penyelenggaraan sebagian rangkaian acara tersebut.\n\nKami sangat mengharapkan kesediaan Bapak/Ibu Ketua Umum KONI Jawa Barat untuk menerima audiensi kami. Mengenai waktu dan tanggal pelaksanaan audiensi, kami sepenuhnya menyerahkan dan akan mengikuti jadwal yang dapat Bapak/Ibu berikan.\n\nDemikian surat permohonan ini kami sampaikan. Atas perhatian dan kesediaan Bapak/Ibu, kami mengucapkan terima kasih.\n\nHormat kami,\n\nKetua RW 03\nKelurahan Padasuka\n\n\n(Raden Raka)	\N	2026-03-08 20:17:42.24885	002/SK-RW/RW-03/03/2026
3	Surat Permohonan Audiensi	Permohonan Penggunaan asset koni jabar di padasuka cimahi	KONI Jawa Barat	SURAT PERMOHONAN AUDIENSI\n\nPerihal: Permohonan Penggunaan asset koni jabar di padasuka cimahi\n\n9 Maret 2026\n\nYth. Ketua KONI Jawa Barat\ndi tempat\n\nDengan hormat,\n\nYang bertanda tangan di bawah ini:\nNama : Raden Raka\nJabatan : Ketua RW 03 Kelurahan Padasuka\nAlamat : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nBersama surat ini, kami mewakili seluruh warga RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, bermaksud mengajukan permohonan audiensi dengan Bapak/Ibu Ketua KONI Jawa Barat.\n\nAdapun latar belakang dan tujuan permohonan audiensi ini adalah sebagai berikut:\nDalam rangka menyambut dan memeriahkan Hari Ulang Tahun Kemerdekaan Republik Indonesia pada tanggal 17 Agustus 2026, kami, selaku Ketua RW 03 dan juga Ketua Karang Taruna RW 03, memiliki rencana besar untuk menyelenggarakan perayaan 17 Agustus yang termegah di Kota Cimahi. Kami melihat potensi besar pada lapangan aset KONI Jawa Barat yang berlokasi di Kelurahan Padasuka untuk dijadikan lokasi utama penyelenggaraan acara, khususnya untuk membuat sebuah mini konser sebagai bagian dari rangkaian perayaan tersebut.\n\nOleh karena itu, kami sangat mengharapkan kesempatan untuk dapat berdiskusi langsung dengan Bapak/Ibu mengenai rencana penggunaan aset KONI Jawa Barat tersebut. Kami memohon kesediaan Bapak/Ibu untuk menerima audiensi kami pada:\nHari/Tanggal : Selasa, 17 Maret 2026\nWaktu : Pukul 10.00 Pagi\nTempat : (Menyesuaikan dengan kesediaan Bapak/Ibu)\n\nBesar harapan kami agar permohonan audiensi ini dapat dikabulkan. Atas perhatian dan waktu yang telah Bapak/Ibu luangkan, kami mengucapkan terima kasih.\n\nHormat kami,\n\nKetua RW 03\nKelurahan Padasuka\n\n\n(Raden Raka)	2026-03-09	2026-03-09 03:12:01.054982	003/SK-RW/RW-03/03/2026
\.


--
-- Data for Name: surat_warga; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.surat_warga (id, warga_id, kk_id, jenis_surat, perihal, keterangan, isi_surat, status, nomor_rt, created_at, nomor_surat, metode_layanan, pdf_code, pdf_path, file_surat) FROM stdin;
1	16	1	surat_keterangan_domisili	Untuk Kuliah	\N	Surat sedang diproses, silakan tunggu persetujuan admin.	disetujui	4	2026-03-08 18:24:11.191785	\N	print_mandiri	\N	\N	\N
2	16	1	surat_keterangan_domisili	Kuliah	\N	Nomor           : XXX/RT-4/RW-03/SKD/2026\nPerihal         : Surat Keterangan Domisili (Untuk Keperluan Kuliah)\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 04 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama            : Raden Raka Abdul Kamal Syafaat\nNIK             : 3277020603030019\nJenis Kelamin   : Laki-laki\nAgama           : Islam\nPekerjaan       : Pelajar/Mahasiswa\nAlamat          : Jln Kh Ushman Dhomiri No 48A RT 004 / RW 003\n                  Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nBerdasarkan data kependudukan dan pengamatan kami, nama tersebut di atas benar adalah warga kami yang berdomisili di alamat tersebut.\n\nSurat keterangan domisili ini diberikan untuk keperluan pendaftaran atau administrasi yang berkaitan dengan kegiatan Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 22 Mei 2024\n\nHormat kami,\n\nKetua RT 04                               Ketua RW 03\nKelurahan Padasuka                        Kelurahan Padasuka\n\n\n( Eem Sulaeman )                          ( Nama Ketua RW )\n                                          ( Stempel RW )	disetujui	4	2026-03-08 18:30:02.801926	\N	print_mandiri	\N	\N	\N
3	16	1	surat_keterangan_domisili	Untuk kepentingan Kuliah	\N	SURAT KETERANGAN DOMISILI\n\nPerihal: Untuk kepentingan Kuliah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 04 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                               : Raden raka abdul kamal syafaat\nNIK                                : 3277020603030019\nJenis Kelamin                      : Laki-laki\nAgama                              : Islam\nPekerjaan                          : Pelajar/Mahasiswa\nAlamat                             : Jln Kh Ushman dhomiri no 48A RT 04 / RW 03\n                                   Kelurahan Padasuka\n                                   Kecamatan Cimahi Tengah\n                                   Kota Cimahi\n\nBerdasarkan data dan pengamatan kami, nama tersebut di atas benar adalah warga kami yang berdomisili di alamat tersebut di atas.\n\nSurat keterangan domisili ini diberikan untuk keperluan Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 23 Mei 2024\n\nMengetahui,\nKetua RT 04\n\n\n(Eem Sulaeman)\n\n\nKetua RW 03\n\n\n(Raden Raka)	disetujui	4	2026-03-08 18:48:46.731995	001/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
5	16	1	surat_keterangan_belum_menikah	untuk keperluan KUA	\N	Perihal: Surat Keterangan Belum Menikah\n\nSURAT KETERANGAN BELUM MENIKAH\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Eem Sulaeman\nJabatan              : Ketua RT 04\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03\n\nKelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Raden raka abdul kamal syafaat\nNIK                  : 3277020603030019\nAlamat               : Jln Kh Ushman dhomiri no 48A\nRT/RW                : 04 / 03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas benar-benar belum pernah menikah dan berstatus belum menikah sampai surat keterangan ini diterbitkan.\n\nSurat keterangan ini dibuat untuk keperluan pengurusan pernikahan di Kantor Urusan Agama (KUA).\n\nDemikian surat keterangan ini dibuat dengan sebenarnya dan untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 04                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Eem Sulaeman)                             (Raden Raka)	disetujui	4	2026-03-08 19:21:21.920627	003/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
4	16	1	surat_keterangan_usaha	Untuk Bantuan UMKM	\N	Perihal: Surat Keterangan Usaha (Untuk Bantuan UMKM)\n\nYang bertanda tangan di bawah ini:\n\nNama               : Eem Sulaeman\nJabatan            : Ketua RT 04\nAlamat             : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nNama               : Raden Raka\nJabatan            : Ketua RW 03\nAlamat             : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nDengan ini menerangkan bahwa:\n\nNama               : Raden raka abdul kamal syafaat\nNIK                : 3277020603030019\nAlamat             : Jln Kh Ushman dhomiri no 48A RT 04 / RW 03\nKelurahan          : Padasuka\nKecamatan          : Cimahi Tengah\nKota               : Cimahi\nAgama              : Islam\nPekerjaan          : Pelajar/Mahasiswa\nJenis Kelamin      : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas dan berdasarkan pengamatan serta informasi yang kami terima, yang bersangkutan memiliki dan menjalankan usaha mikro/kecil di lingkungan kami.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan Bantuan Usaha Mikro, Kecil, dan Menengah (UMKM) serta untuk dipergunakan sebagaimana mestinya.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                               Hormat kami,\nKetua RT 04                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Eem Sulaeman)                             (Raden Raka)	disetujui	4	2026-03-08 18:56:32.674213	002/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
6	11	5	surat_keterangan_domisili	Melamar Pekerjaan	\N	Perihal: Surat Keterangan Domisili untuk Melamar Pekerjaan\n\nSURAT KETERANGAN DOMISILI\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Ekariyanti Mulawarman\nNIK                  : 3277024906960010\nJenis Kelamin        : Perempuan\nAgama                : Islam\nPekerjaan            : Ibu Rumah Tangga\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                : 02/03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\n\nBerdasarkan data kependudukan dan pengamatan kami, nama tersebut di atas benar adalah warga kami yang berdomisili di alamat tersebut di atas.\nSurat keterangan ini dibuat sebagai kelengkapan administrasi yang bersangkutan untuk keperluan melamar pekerjaan.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 00:00:54.775388	004/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
8	16	1	surat_keterangan_domisili	untuk beasiswa	\N	SURAT KETERANGAN DOMISILI\nPerihal: Untuk Beasiswa\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 04 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Raden Raka Abdul Kamal Syafaat\nNIK                  : 3277020603030019\nJenis Kelamin        : Laki-laki\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nAlamat               : Jln Kh Ushman Dhomiri No 48A RT 04 RW 03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\n\nMenerangkan bahwa nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan beasiswa.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                          Hormat kami,\nKetua RT 04                                          Ketua RW 03\nKelurahan Padasuka                                   Kelurahan Padasuka\n\n\n(Eem Sulaeman)                                       (Raden Raka)	disetujui	4	2026-03-09 01:25:21.412715	006/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
7	16	1	surat_keterangan_domisili	untuk lomba	\N	SURAT KETERANGAN DOMISILI\n\nPerihal: Untuk lomba\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 04 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama lengkap              : Raden raka abdul kamal syafaat\nNomor Induk Kependudukan  : 3277020603030019\nAlamat                    : Jln Kh Ushman dhomiri no 48A\nRT / RW                   : 04 / 03\nKelurahan                 : Padasuka\nKecamatan                 : Cimahi Tengah\nKota                      : Cimahi\nAgama                     : Islam\nPekerjaan                 : Pelajar/Mahasiswa\nJenis Kelamin             : Laki-laki\n\nBerdasarkan data kependudukan yang ada pada kami, nama tersebut di atas benar adalah warga kami yang berdomisili di alamat tersebut.\n\nSurat keterangan domisili ini dibuat untuk keperluan mengikuti lomba.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui, | Hormat kami,\nKetua RT 04 | Ketua RW 03\nKelurahan Padasuka | Kelurahan Padasuka\n|\n|\n(Eem Sulaeman) | (Raden Raka)	disetujui	4	2026-03-09 01:07:57.37167	005/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
18	14	5	surat_keterangan_pindah	Pindah Rumah	\N	SURAT KETERANGAN PINDAH\n\nPerihal: Pindah Rumah\n\nYang bertanda tangan di bawah ini, kami Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                  : Rizky Syahrul Mubarok\nNIK                   : 3277021705190004\nAlamat                : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW               : 02 / 03\nKelurahan             : Padasuka\nKecamatan             : Cimahi Tengah\nKota                  : Cimahi\nAgama                 : Islam\nPekerjaan             : Pelajar/Mahasiswa\nJenis Kelamin         : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas.\nSurat keterangan ini dibuat sebagai kelengkapan administrasi yang bersangkutan untuk keperluan Pindah Rumah ke alamat baru.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:31:59.641539	016/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
13	11	5	surat_keterangan_tidak_mampu	Permohonan KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Permohonan KIP Kuliah\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Jajang Kusmana\nJabatan              : Ketua RT 02\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03\n\nDengan ini menerangkan bahwa:\n\nNama                 : Ekariyanti Mulawarman\nNIK                  : 3277024906960010\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW              : 002 / 003\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Ibu Rumah Tangga\nJenis Kelamin        : Perempuan\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan tergolong dalam keluarga yang kurang mampu/prasejahtera.\n\nSurat keterangan ini dibuat untuk melengkapi persyaratan Permohonan KIP Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                | Hormat kami,\nKetua RT 02                                | Ketua RW 03\nKelurahan Padasuka                         | Kelurahan Padasuka\n                                           |\n                                           |\n(Jajang Kusmana)                           | (Raden Raka)	disetujui	2	2026-03-09 05:23:59.315738	012/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
9	16	1	surat_keterangan_domisili	untuk melamar kerja	\N	SURAT KETERANGAN DOMISILI\nPerihal: Keterangan Domisili untuk Melamar Kerja\n\nYang bertanda tangan di bawah ini:\n\nNama                  : Eem Sulaeman\nJabatan               : Ketua RT 04\nAlamat                : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nNama                  : Raden Raka\nJabatan               : Ketua RW 03\nAlamat                : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nDengan ini menerangkan bahwa:\n\nNama                  : Raden raka abdul kamal syafaat\nNIK                   : 3277020603030019\nAlamat                : Jln Kh Ushman dhomiri no 48A\nRT/RW                 : 004/003\nKelurahan             : Padasuka\nKecamatan             : Cimahi Tengah\nKota                  : Cimahi\nAgama                 : Islam\nPekerjaan             : Pelajar/Mahasiswa\nJenis Kelamin         : Laki-laki\n\nBerdasarkan data dan pengamatan kami, nama tersebut di atas benar adalah warga kami yang berdomisili di alamat tersebut di atas. Surat keterangan ini dibuat untuk keperluan melamar kerja.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 04                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Eem Sulaeman)                              (Raden Raka)	disetujui	4	2026-03-09 01:47:13.640058	007/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
17	14	5	surat_keterangan_pindah	Pindah Rumah	\N	SURAT KETERANGAN PINDAH\nPerihal: Pindah Rumah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama            : Rizky Syahrul Mubarok\nNIK             : 3277021705190004\nAlamat          : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW           : 02/03\nKelurahan       : Padasuka\nKecamatan       : Cimahi Tengah\nKota            : Cimahi\nAgama           : Islam\nPekerjaan       : Pelajar/Mahasiswa\nJenis Kelamin   : Laki-laki\n\nBerdasarkan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang beralamat di JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 02 RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi.\n\nSurat keterangan ini dibuat sebagai kelengkapan administrasi yang bersangkutan dalam rangka kepindahan domisili dari alamat tersebut di atas.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                  Ketua RW 03\nKelurahan Padasuka                           Kelurahan Padasuka\n\n\n(Jajang Kusmana)                             (Raden Raka)	disetujui	2	2026-03-09 05:27:30.560225	009/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
12	11	5	surat_keterangan_tidak_mampu	Permohonan KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Permohonan KIP Kuliah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama lengkap       : Ekariyanti Mulawarman\nNIK                : 3277024906960010\nJenis Kelamin      : Perempuan\nAgama              : Islam\nPekerjaan          : Ibu Rumah Tangga\nAlamat             : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 RW 003\n                     Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang tergolong dalam keluarga kurang mampu/prasejahtera.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan Permohonan KIP Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Jajang Kusmana)                           (Raden Raka)	disetujui	2	2026-03-09 05:22:54.824504	011/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
10	11	5	surat_keterangan_tidak_mampu	Membuat BPJS PBI ( Pemerintah )	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Permohonan Pembuatan BPJS PBI (Pemerintah)\n\nYang bertanda tangan di bawah ini, kami Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Ekariyanti Mulawarman\nNIK                  : 3277024906960010\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 02 / RW 03\n                       Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\nAgama                : Islam\nPekerjaan            : Ibu Rumah Tangga\nJenis Kelamin        : Perempuan\n\nBerdasarkan pengamatan dan data yang ada pada kami, yang bersangkutan benar-benar tergolong keluarga tidak mampu dan layak untuk mendapatkan bantuan program BPJS PBI (Penerima Bantuan Iuran) dari Pemerintah.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan BPJS PBI (Pemerintah).\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:21:16.977267	008/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
11	11	5	surat_keterangan_tidak_mampu	Membuat BPJS PBI ( Pemerintah )	\N	SURAT KETERANGAN TIDAK MAMPU\n\nPerihal: Membuat BPJS PBI (Pemerintah)\n\nYang bertanda tangan di bawah ini adalah Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama lengkap      : Ekariyanti Mulawarman\nNIK               : 3277024906960010\nAlamat            : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW             : 2 / 03\nKelurahan         : Padasuka\nKecamatan         : Cimahi Tengah\nKota              : Cimahi\nAgama             : Islam\nPekerjaan         : Ibu Rumah Tangga\nJenis Kelamin     : Perempuan\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan termasuk dalam kategori keluarga tidak mampu.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan BPJS PBI (Penerima Bantuan Iuran) dari Pemerintah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:22:12.900975	010/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
14	14	5	surat_keterangan_tidak_mampu	Pengaktifan kembali BPJS PBI untuk ke Rumah Sakit	\N	SURAT KETERANGAN TIDAK MAMPU\n\nPerihal: Pengaktifan kembali BPJS PBI untuk ke Rumah Sakit\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Jajang Kusmana\nJabatan              : Ketua RT 02 Kelurahan Padasuka\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03 Kelurahan Padasuka\n\nDengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                : 02/03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas dan berdasarkan pengamatan serta data yang ada pada kami, yang bersangkutan tergolong dalam keluarga tidak mampu.\n\nSurat keterangan ini dibuat untuk keperluan pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran) agar dapat digunakan untuk pelayanan kesehatan di Rumah Sakit.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:24:34.793706	013/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
15	11	5	surat_keterangan_kematian	Keterangan Kematian	\N	SURAT KETERANGAN KEMATIAN\nPerihal: Keterangan Kematian\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 002 dan Ketua Rukun Warga (RW) 003 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Ekariyanti Mulawarman\nNIK                  : 3277024906960010\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 RW 003\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Ibu Rumah Tangga\nJenis Kelamin        : Perempuan\n\nBerdasarkan informasi dan data yang kami terima, nama tersebut di atas telah meninggal dunia pada:\nHari/Tanggal         : [Isi Hari/Tanggal Kematian]\nPukul                : [Isi Pukul Kematian]\nDi                   : [Isi Tempat Kematian]\nPenyebab Kematian    : [Isi Penyebab Kematian, jika diketahui]\n\nSurat keterangan ini dibuat sebagai kelengkapan administrasi dan dapat dipergunakan sebagaimana mestinya.\n\nDemikian surat keterangan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:25:53.47029	014/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
16	14	5	surat_keterangan_pindah	Pindah Rumah	\N	SURAT KETERANGAN PINDAH\nPerihal: Pindah Rumah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                     : Rizky Syahrul Mubarok\nNIK                      : 3277021705190004\nAlamat                   : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW                  : 02 / 03\nKelurahan                : Padasuka\nKecamatan                : Cimahi Tengah\nKota                     : Cimahi\nAgama                    : Islam\nPekerjaan                : Pelajar/Mahasiswa\nJenis Kelamin            : Laki-laki\n\nMenerangkan bahwa nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan saat ini yang bersangkutan akan pindah tempat tinggal dari alamat tersebut di atas.\n\nSurat keterangan ini dibuat sebagai kelengkapan administrasi yang diperlukan untuk proses kepindahan yang bersangkutan.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:27:10.79621	015/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
20	14	5	surat_keterangan_kematian	Membuat Akta Kematian	\N	SURAT KETERANGAN KEMATIAN\nPerihal: Membuat Akta Kematian\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nBerdasarkan data yang kami terima dan sepengetahuan kami, almarhum/almarhumah:\nNama                       : Rizky Syahrul Mubarok\nNIK                        : 3277021705190004\nAlamat                     : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW                    : 02	disetujui	2	2026-03-09 05:33:18.685805	018/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
19	14	5	surat_keterangan_lainnya	Pengajuan Bansos	\N	SURAT KETERANGAN\nPerihal: Pengajuan Bansos\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nJenis Kelamin        : Laki-laki\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                : 02/03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\n\nBerdasarkan data kependudukan dan pengamatan kami di lingkungan, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut.\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan Bantuan Sosial (Bansos).\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                               | Hormat kami,\nKetua RT 02                                | Ketua RW 03\nKelurahan Padasuka                         | Kelurahan Padasuka\n                                           |\n                                           |\n(Jajang Kusmana)                           | (Raden Raka)	disetujui	2	2026-03-09 05:32:30.964547	017/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
21	14	5	surat_keterangan_tidak_mampu	KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\n\nPerihal: KIP Kuliah\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Jajang Kusmana\nJabatan              : Ketua RT 02\nAlamat               : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03\nAlamat               : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nDengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 02 / RW 03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas. Berdasarkan pengamatan dan data yang ada pada kami, yang bersangkutan beserta keluarganya tergolong dalam kategori keluarga tidak mampu.\n\nSurat keterangan ini dibuat sebagai salah satu persyaratan untuk pengajuan KIP Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                               Hormat kami,\nKetua RT 02                               Ketua RW 03\nKelurahan Padasuka                        Kelurahan Padasuka\n\n\n(Jajang Kusmana)                          (Raden Raka)	disetujui	2	2026-03-09 05:33:38.68432	019/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
22	14	5	surat_keterangan_tidak_mampu	KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: KIP Kuliah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 002 dan Ketua Rukun Warga (RW) 003 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nJenis Kelamin        : Laki-laki\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 RW 003\n                       Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nBerdasarkan pengamatan dan data yang ada di lingkungan kami, nama tersebut di atas benar-benar tergolong keluarga tidak mampu.\n\nSurat keterangan ini dibuat untuk melengkapi persyaratan pengajuan Kartu Indonesia Pintar (KIP) Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui, | Hormat kami,\nKetua RT 02 | Ketua RW 03\nKelurahan Padasuka | Kelurahan Padasuka\n|\n|\n(Jajang Kusmana) | (Raden Raka)	disetujui	2	2026-03-09 05:33:56.616497	020/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
23	14	5	surat_keterangan_tidak_mampu	KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\n\nPerihal: KIP Kuliah\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW              : 02 / 03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, serta informasi dari lingkungan sekitar, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan berasal dari keluarga yang tergolong kurang mampu secara ekonomi.\n\nSurat keterangan ini dibuat sebagai salah satu persyaratan untuk pengajuan beasiswa KIP Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui, | Hormat kami,\nKetua RT 02 | Ketua RW 03\nKelurahan Padasuka | Kelurahan Padasuka\n|\n|\n(Jajang Kusmana) | (Raden Raka)	disetujui	2	2026-03-09 05:34:40.629722	021/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
24	14	5	surat_keterangan_tidak_mampu	KIP Kuliah	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: KIP Kuliah\n\nYang bertanda tangan di bawah ini, kami Ketua Rukun Tetangga (RT) 002 dan Ketua Rukun Warga (RW) 003 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama               : Jajang Kusmana\nJabatan            : Ketua RT 002\n\nNama               : Raden Raka\nJabatan            : Ketua RW 003\n\nDengan ini menyatakan bahwa warga kami yang tersebut di bawah ini:\n\nNama               : Rizky Syahrul Mubarok\nNIK                : 3277021705190004\nAlamat             : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 RW 003\nKelurahan          : Padasuka\nKecamatan          : Cimahi Tengah\nKota               : Cimahi\nAgama              : Islam\nPekerjaan          : Pelajar/Mahasiswa\nJenis Kelamin      : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, yang bersangkutan benar-benar warga kami yang tergolong dalam keluarga kurang mampu/tidak mampu.\n\nSurat keterangan ini dibuat sebagai salah satu syarat untuk pengajuan KIP Kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Jajang Kusmana)                           (Raden Raka)	disetujui	2	2026-03-09 05:34:57.462039	022/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
25	14	5	surat_keterangan_lainnya	Keterangan Penghasilan	\N	SURAT KETERANGAN PENGHASILAN\nPerihal: Keterangan Penghasilan\n\nYang bertanda tangan di bawah ini, kami Ketua Rukun Tetangga (RT) 002 dan Ketua Rukun Warga (RW) 003 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama        : Rizky Syahrul Mubarok\nNIK         : 3277021705190004\nAlamat      : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 RW 003\nKelurahan   : Padasuka\nKecamatan   : Cimahi Tengah\nKota        : Cimahi\nAgama       : Islam\nPekerjaan   : Pelajar/Mahasiswa\nJenis Kelamin: Laki-laki\n\nBerdasarkan pengamatan dan informasi yang kami terima dari lingkungan sekitar, nama tersebut di atas adalah benar warga kami yang beralamat sebagaimana tercantum di atas.\n\nSehubungan dengan perihal tersebut, kami menerangkan bahwa yang bersangkutan, Rizky Syahrul Mubarok, adalah seorang Pelajar/Mahasiswa dan berdasarkan sepengetahuan kami, yang bersangkutan belum memiliki penghasilan tetap/sendiri dan masih dalam tanggungan orang tua/wali.\n\nSurat keterangan ini dibuat sebagai kelengkapan administrasi untuk keperluan pengajuan beasiswa atau bantuan pendidikan, atau keperluan lain yang membutuhkan keterangan penghasilan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                               Hormat kami,\nKetua RT 02                               Ketua RW 03\nKelurahan Padasuka                        Kelurahan Padasuka\n\n\n(Jajang Kusmana)                          (Raden Raka)	disetujui	2	2026-03-09 05:35:30.98564	023/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
26	14	5	surat_keterangan_lainnya	Keringanan Biaya Kuliah	\N	SURAT KETERANGAN\nPerihal: Keringanan Biaya Kuliah\n\nCimahi, 9 Maret 2026\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 002 dan Ketua Rukun Warga (RW) 003 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama           : Rizky Syahrul Mubarok\nNIK            : 3277021705190004\nAlamat         : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW          : 002/003\nKelurahan      : Padasuka\nKecamatan      : Cimahi Tengah\nKota           : Cimahi\nAgama          : Islam\nPekerjaan      : Pelajar/Mahasiswa\nJenis Kelamin  : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas.\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengajuan keringanan biaya kuliah.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Jajang Kusmana)                           (Raden Raka)	disetujui	2	2026-03-09 05:35:55.962623	024/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
27	14	5	surat_keterangan_lainnya	Keterangan tidak berpenghasilan	\N	SURAT KETERANGAN TIDAK BERPENGHASILAN\nPerihal: Keterangan tidak berpenghasilan\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                : 02/03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas benar-benar tidak memiliki penghasilan tetap atau tidak berpenghasilan. Surat keterangan ini dibuat berdasarkan permohonan yang bersangkutan dan untuk dipergunakan sebagai kelengkapan administrasi yang diperlukan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Jajang Kusmana)                           (Raden Raka)	disetujui	2	2026-03-09 05:36:22.088226	025/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
28	14	5	surat_keterangan_lainnya	Membuat NA	\N	SURAT KETERANGAN LAINNYA\nPerihal: Membuat NA\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                  : Rizky Syahrul Mubarok\nNIK                   : 3277021705190004\nAlamat                : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW               : 02 / 03\nKelurahan             : Padasuka\nKecamatan             : Cimahi Tengah\nKota                  : Cimahi\nAgama                 : Islam\nPekerjaan             : Pelajar/Mahasiswa\nJenis Kelamin         : Laki-laki\n\nBerdasarkan data kependudukan dan pengamatan kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan berkelakuan baik di lingkungan masyarakat.\n\nSurat keterangan ini dibuat untuk keperluan Membuat NA.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                               Hormat kami,\nKetua RT 02                               Ketua RW 03\nKelurahan Padasuka                        Kelurahan Padasuka\n\n\n(Jajang Kusmana)                          (Raden Raka)	disetujui	2	2026-03-09 05:37:00.568205	026/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
29	14	5	surat_keterangan_tidak_mampu	Pengaktifan BPJS PBI	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan BPJS PBI\n\nYang bertanda tangan di bawah ini, kami Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                  : Rizky Syahrul Mubarok\nNIK                   : 3277021705190004\nAlamat                : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                 : 02/03\nKelurahan             : Padasuka\nKecamatan             : Cimahi Tengah\nKota                  : Cimahi\nAgama                 : Islam\nPekerjaan             : Pelajar/Mahasiswa\nJenis Kelamin         : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, yang bersangkutan benar-benar tergolong keluarga tidak mampu dan layak mendapatkan bantuan. Surat keterangan ini dibuat untuk keperluan pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran).\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.\n\nCimahi, 9 Maret 2026\n\nMengetahui,             Hormat kami,\nKetua RT 02             Ketua RW 03\nKelurahan Padasuka      Kelurahan Padasuka\n\n\n(Jajang Kusmana)        (Raden Raka)	disetujui	2	2026-03-09 05:37:29.2888	027/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
31	14	5	surat_keterangan_tidak_mampu	Pengaktifan BPJS PBI	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan BPJS PBI\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Jajang Kusmana\nJabatan              : Ketua RT 02\nAlamat               : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03\nAlamat               : Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi\n\nDengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                : 002/003\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas benar-benar warga kami yang berdomisili di alamat tersebut dan tergolong dalam keluarga tidak mampu.\n\nSurat keterangan ini dibuat sebagai persyaratan untuk pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran) yang bersangkutan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:48:42.686281	029/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
30	14	5	surat_keterangan_tidak_mampu	Pengaktifan BPJS PBI	\N	SURAT KETERANGAN TIDAK MAMPU\n\nPerihal: Pengaktifan BPJS PBI\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama lengkap : Rizky Syahrul Mubarok\nNIK          : 3277021705190004\nAlamat       : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 02 / RW 03\nKelurahan    : Padasuka\nKecamatan    : Cimahi Tengah\nKota         : Cimahi\nAgama        : Islam\nPekerjaan    : Pelajar/Mahasiswa\nJenis Kelamin: Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan tergolong dalam keluarga yang tidak mampu secara ekonomi.\n\nSurat keterangan ini dibuat sebagai persyaratan untuk pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran) atas nama yang bersangkutan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                 Ketua RW 03\nKelurahan Padasuka                          Kelurahan Padasuka\n\n\n(Jajang Kusmana)                            (Raden Raka)	disetujui	2	2026-03-09 05:48:19.33796	028/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
32	14	5	surat_keterangan_tidak_mampu	Pengaktifan BPJS PBI	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan BPJS PBI\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW              : 02 / 03\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas benar-benar warga kami yang tergolong dalam keluarga tidak mampu.\n\nSurat keterangan ini dibuat sebagai salah satu persyaratan untuk pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran) yang bersangkutan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 9 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                  Ketua RW 03\nKelurahan Padasuka                           Kelurahan Padasuka\n\n\n(Jajang Kusmana)                             (Raden Raka)	disetujui	2	2026-03-09 05:50:19.320315	030/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
33	14	5	surat_keterangan_lainnya	keterangan janda untuk pemutihan pensiunan	\N	SURAT KETERANGAN\nPerihal: Keterangan Janda untuk Pemutihan Pensiunan\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama        : Rizky Syahrul Mubarok\nNIK         : 3277021705190004\nAlamat      : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT / RW     : 02 / 03\nKelurahan   : Padasuka\nKecamatan   : Cimahi Tengah\nKota        : Cimahi\nAgama       : Islam\nPekerjaan   : Pelajar/Mahasiswa\nJenis Kelamin: Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas.\n\nSurat keterangan ini dibuat untuk keperluan pengurusan keterangan janda dalam rangka pemutihan pensiunan.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.\n\nCimahi, 10 Maret 2026\n\nMengetahui,                                | Hormat kami,\nKetua RT 02                                | Ketua RW 03\nKelurahan Padasuka                         | Kelurahan Padasuka\n                                           |\n                                           |\n(Jajang Kusmana)                           | (Raden Raka)	disetujui	2	2026-03-10 04:10:36.286662	031/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
34	14	5	surat_keterangan_tidak_mampu	pengaktifan kembali bpjs pbi (pemerintah)	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan Kembali BPJS PBI (Pemerintah)\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama           : Rizky Syahrul Mubarok\nNIK            : 3277021705190004\nAlamat         : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW          : 02/03\nKelurahan      : Padasuka\nKecamatan      : Cimahi Tengah\nKota           : Cimahi\nAgama          : Islam\nPekerjaan      : Pelajar/Mahasiswa\nJenis Kelamin  : Laki-laki\n\nBerdasarkan pengamatan dan data yang ada pada kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan tergolong dalam keluarga tidak mampu secara ekonomi.\n\nSurat keterangan ini dibuat sebagai persyaratan untuk pengaktifan kembali kepesertaan BPJS PBI (Penerima Bantuan Iuran) Pemerintah atas nama yang bersangkutan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.\n\nCimahi, 10 Maret 2026\n\nMengetahui,                                 Hormat kami,\nKetua RT 02                                Ketua RW 03\nKelurahan Padasuka                         Kelurahan Padasuka\n\n\n(Jajang Kusmana)                           (Raden Raka)	disetujui	2	2026-03-10 04:11:27.025342	032/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
35	14	5	surat_keterangan_tidak_mampu	pengaktifan kembali bpjs pbi (pemerintah)	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: pengaktifan kembali bpjs pbi (pemerintah)\n\nYang bertanda tangan di bawah ini:\n\nNama                 : Jajang Kusmana\nJabatan              : Ketua RT 02 Kelurahan Padasuka\n\nNama                 : Raden Raka\nJabatan              : Ketua RW 03 Kelurahan Padasuka\n\nDengan ini menerangkan bahwa:\n\nNama                 : Rizky Syahrul Mubarok\nNIK                  : 3277021705190004\nAlamat               : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F RT 002 / RW 003\nKelurahan            : Padasuka\nKecamatan            : Cimahi Tengah\nKota                 : Cimahi\nAgama                : Islam\nPekerjaan            : Pelajar/Mahasiswa\nJenis Kelamin        : Laki-laki\n\nAdalah benar warga kami yang berdomisili di alamat tersebut di atas. Berdasarkan pengamatan dan data yang ada pada kami, yang bersangkutan benar-benar tergolong keluarga tidak mampu dan membutuhkan bantuan untuk pengaktifan kembali BPJS PBI (Pemerintah).\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengaktifan kembali BPJS PBI (Pemerintah) atas nama yang bersangkutan.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 10 Maret 2026\n\nMengetahui,                                          Hormat kami,\nKetua RT 02                                          Ketua RW 03\nKelurahan Padasuka                                   Kelurahan Padasuka\n\n\n(Jajang Kusmana)                                     (Raden Raka)	disetujui	2	2026-03-10 04:11:49.233934	033/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
36	14	5	surat_keterangan_tidak_mampu	pengaktifan kembali bpjs pbi (pemerintah)	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan Kembali BPJS PBI (Pemerintah)\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama           : Rizky Syahrul Mubarok\nNIK            : 3277021705190004\nAlamat         : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW          : 002/003\nKelurahan      : Padasuka\nKecamatan      : Cimahi Tengah\nKota           : Cimahi\nAgama          : Islam\nPekerjaan      : Pelajar/Mahasiswa\nJenis Kelamin  : Laki-laki\n\nBerdasarkan data dan pengamatan kami, nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut di atas. Yang bersangkutan tergolong dalam kategori keluarga tidak mampu dan sangat membutuhkan bantuan untuk pengaktifan kembali kepesertaan BPJS PBI (Pemerintah).\n\nSurat keterangan ini dibuat sebagai kelengkapan persyaratan untuk pengaktifan kembali BPJS PBI (Pemerintah) yang bersangkutan.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 10 Maret 2026\n\nMengetahui,                   | Hormat kami,\nKetua RT 02                   | Ketua RW 03\nKelurahan Padasuka            | Kelurahan Padasuka\n                              |\n                              |\n(Jajang Kusmana)              | (Raden Raka)	disetujui	2	2026-03-10 04:12:23.867591	034/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
37	14	5	surat_keterangan_tidak_mampu	pengaktifan kembali bpjs pbi (pemerintah)	\N	SURAT KETERANGAN TIDAK MAMPU\nPerihal: Pengaktifan Kembali BPJS PBI (Pemerintah)\n\nYang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 02 dan Ketua Rukun Warga (RW) 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi, dengan ini menerangkan bahwa:\n\nNama                          : Rizky Syahrul Mubarok\nNIK                           : 3277021705190004\nAlamat                        : JL. KH Usman Dhomiri Gg. Bakti Baru II No. 13 F\nRT/RW                         : 02/03\nKelurahan                     : Padasuka\nKecamatan                     : Cimahi Tengah\nKota                          : Cimahi\nAgama                         : Islam\nPekerjaan                     : Pelajar/Mahasiswa\nJenis Kelamin                 : Laki-laki\n\nMenerangkan bahwa nama tersebut di atas adalah benar warga kami yang berdomisili di alamat tersebut dan berdasarkan pengamatan serta data yang ada pada kami, yang bersangkutan tergolong dalam kategori keluarga tidak mampu.\n\nSurat keterangan ini dibuat sebagai persyaratan untuk pengaktifan kembali kepesertaan BPJS PBI (Pemerintah) atas nama yang bersangkutan.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\nCimahi, 10 Maret 2026\n\nMengetahui,                               | Hormat kami,\nKetua RT 02                                | Ketua RW 03\nKelurahan Padasuka                         | Kelurahan Padasuka\n                                           |\n                                           |\n(Jajang Kusmana)                           | (Raden Raka)	disetujui	2	2026-03-10 04:15:31.421041	035/SK-W/RW-03/03/2026	print_mandiri	\N	\N	\N
38	73	23	surat_keterangan_lainnya	Membut NA	-	\N	disetujui	4	2026-03-11 07:01:23.002117	038/RW03/03/2026	tau_beres	\N	\N	\N
40	1131	378	surat_keterangan_tidak_mampu	Memperbaharui data DTKS	\N	\N	disetujui	6	2026-03-11 08:18:55.21542	037/RW03/03/2026	print_mandiri	\N	\N	/uploads/surat/1773264809664-jkrppak4kj.jpeg
39	1131	378	surat_keterangan_domisili	Keterangan Domisili	\N	\N	disetujui	6	2026-03-11 08:07:28.3968	036/RW03/03/2026	tau_beres	\N	\N	/uploads/surat/1773264830106-jd6p9o03w.jpeg
41	1201	401	surat_keterangan_usaha	Keperluan untuk Iklan	Kebutuhan untuk Iklan di google ads yang bisa ditampilkan di website 	\N	disetujui	6	2026-03-12 03:52:52.637705	039/RT-06/RW-03/03/2026	print_mandiri	\N	\N	/uploads/surat/1773388427601-dqmasesfub.pdf
42	11	5	surat_keterangan_lainnya	Permohonan Pengaktifan kembali ASKES PNS	\N	\N	disetujui	2	2026-03-15 03:58:55.614239	040/RT-01/RW-03/03/2026	print_mandiri	\N	\N	/uploads/surat/1773547231509-jdgi8gm38of.jpeg
\.


--
-- Data for Name: survey_usaha; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.survey_usaha (id, usaha_id, tanggal_survey, petugas_survey, kesesuaian_data, dampak_kebisingan, dampak_bau, dampak_limbah, kondisi_lokasi, catatan_survey, foto_lokasi, rekomendasi, created_at) FROM stdin;
\.


--
-- Data for Name: usaha; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usaha (id, nama_pemilik, nik_pemilik, nomor_wa_pemilik, alamat_pemilik, nama_usaha, jenis_usaha, alamat_usaha, rt, nib, deskripsi_usaha, lama_usaha, jam_operasional_mulai, jam_operasional_selesai, modal_usaha, omset_bulanan, status, nomor_stiker, tanggal_stiker_terbit, tanggal_stiker_expired, alasan_penolakan, created_at) FROM stdin;
\.


--
-- Data for Name: wa_blast; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wa_blast (id, pesan, kategori_filter, filter_rt, jumlah_penerima, status, created_at, jumlah_berhasil) FROM stdin;
1	Test mohon di abaikan ini hanya test.	per_rt	7	2	terkirim	2026-03-08 20:31:51.80479	2
2	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\n\nKumaha damang, Wargi sadayana? Semoga sehat selalu ya.\nRaden Raka di sini. Mohon maaf sebelumnya kalau WA ini masuk.\nSaya mau ngasih tau kalau ini lagi test WA blast.\nKemarin sempat error, jadi saya coba lagi biar nanti lancar.\nTujuannya biar info dari RW bisa sampai ke Wargi semua.\nMohon dimaklumi ya, Wargi.\n\nInfo lengkap bisa dicek di web kita 👉  rw3padasukacimahi.org\n\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	per_rt	7	2	terkirim	2026-03-08 20:45:19.721196	2
3	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\n\nPunten pisan nih, Wargi semua.\nRaden Raka mau ngasih kabar sebentar.\nIni saya lagi coba tes fitur WA blast kita.\nSoalnya kemarin sempat ada kendala teknis, jadi beberapa pesan nggak terkirim.\nAlhamdulillah, kalau pesan ini sampai ke {gender} {warga}, berarti tesnya berhasil!\nSemoga ke depannya komunikasi kita makin lancar ya.\n\nInfo lengkap bisa dicek di web kita 👉  rw3padasukacimahi.org\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	semua	\N	403	terkirim	2026-03-08 20:46:23.034351	403
4	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\n\nKumaha damang Wargi sadayana?\nSaya Raden Raka, Ketua RW 03, mau ngucapin selamat menjalankan ibadah puasa hari ini,\nSemoga puasa kita semua lancar, penuh berkah, dan diberikan kekuatan sampai waktu berbuka nanti.\nTetap semangat ya Wargi, jaga kesehatan!\n\nInfo lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	semua	\N	438	terkirim	2026-03-09 21:47:17.847095	438
5	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\nKumaha damang? Semoga sehat selalu ya, Wargi!\nAda info penting nih dari RW 03 soal kegiatan Posyandu & Posbindu.\nYuk, kita ramaikan layanan kesehatan untuk keluarga kita!\n🗓 Hari/Tanggal: [Jumat, 13 Maret 2026]\n⏰ Waktu: [08.30 - 10.30 WIB]\n📍 Tempat: [Balai RW 03]\nSasaran & Persyaratan:\n👶 Ibu, Bayi & Balita: Bawa Buku KIA/KMS.\n👴 Lansia & Pra-Lansia: Bawa KTP.\nKehadiran Wargi semua penting banget buat pantau kesehatan. Ditunggu pisan ya!\nInfo lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	per_rt	1	75	terkirim	2026-03-11 07:04:40.404717	75
7	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\nKumaha damang? Semoga sehat selalu ya, Wargi!\nAda info penting nih dari RW 03 soal kegiatan Posyandu & Posbindu.\nYuk, kita ramaikan layanan kesehatan untuk keluarga kita!\n🗓 Hari/Tanggal: [Jumat, 13 Maret 2026]\n⏰ Waktu: [08.30 - 10.30 WIB]\n📍 Tempat: [Balai RW 03]\nSasaran & Persyaratan:\n👶 Ibu, Bayi & Balita: Bawa Buku KIA/KMS.\n👴 Lansia & Pra-Lansia: Bawa KTP.\nKehadiran Wargi semua penting banget buat pantau kesehatan. Ditunggu pisan ya!\nInfo lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	per_rt	3	114	terkirim	2026-03-11 07:10:00.954466	114
6	Assalamu'alaikum Wr. Wb.\n{gender} {warga} Wargi {rtxx} yang terhormat,\nKumaha damang? Semoga sehat selalu ya, Wargi!\nAda info penting nih dari RW 03 soal kegiatan Posyandu & Posbindu.\nYuk, kita ramaikan layanan kesehatan untuk keluarga kita!\n🗓 Hari/Tanggal: [Jumat, 13 Maret 2026]\n⏰ Waktu: [08.30 - 10.30 WIB]\n📍 Tempat: [Balai RW 03]\nSasaran & Persyaratan:\n👶 Ibu, Bayi & Balita: Bawa Buku KIA/KMS.\n👴 Lansia & Pra-Lansia: Bawa KTP.\nKehadiran Wargi semua penting banget buat pantau kesehatan. Ditunggu pisan ya!\nInfo lengkap bisa dicek di web kita 👉 rw3padasukacimahi.org\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	per_rt	2	120	terkirim	2026-03-11 07:06:57.6058	120
8	\n📢 Info dari Ketua RW 03 Padasuka\n-\n{sapaan} {warga} Wargi {rtxx}, assalamu’alaikum 🙏\n-\nSaya mau cerita jujur soal tiang provider yang ada di wilayah kita.\nTiang udah lama berdiri dan izinnya udah beres dari pengurus RW sebelum sebelumnya. Tapi selama ini operatornya belum pernah masuk. Ini yang bahaya — kalau ada kejadian, ga ada yang bisa dimintai tanggung jawab, ga ada asuransi, warga yang rugi.\nBegitu saya menjabat, langsung saya urus.\n-\n⚠️ PAHAMI INI BAIK-BAIK\nSaya tau ada cerita kurang enak soal tiang ini di masa lalu. Tapi tolong dibedakan 👇\n-\nDulu → konflik soal pembangunan tiang\nSekarang → hanya pemasangan operator\n-\nIni dua hal yang sama sekali berbeda. Tidak ada pembangunan baru. Tidak ada izin baru dari warga yang diperlukan. Ini murni proses aktivasi operator yang memang sudah jadi hak mereka setelah izin prinsip keluar.\n-\n🏆 YANG BERHASIL SAYA PERJUANGKAN\n✅ Operator resmi sudah masuk & bertanggung jawab penuh\n✅ Warga terlindungi secara hukum\n✅ Kontribusi Rp 30 juta berhasil saya dapatkan\n✅ Asuransi Warga Sekitar Terjamin\n-\n💰 SOAL UANG 30 JUTA — SAYA MINTA DIPAHAMI\nIni bukan uang pembagian. Ini bukan hak warga per kepala. Kenapa?\nKarena ini bukan izin pembangunan tiang. Ini adalah kontribusi yang saya perjuangkan dari operator sebagai bentuk kontribusi ke wilayah kita — dan sebetulnya mereka tidak wajib memberikan ini.\nMaka uang ini masuk sebagai kas RW dan peruntukannya untuk kepentingan kita bersama:\n→ 🏘️ Fasilitas & infrastruktur warga (CCTV) (PJL PJG) \n→ 🎉 Kegiatan warga RW 03\n→ 🏦 Kas operasional RW\nBukan dibagi-bagi. Tapi dinikmati bersama.\n-\n🗓️ KAPAN UANGNYA CAIR?\nH+14 setelah operator resmi terpasang.\nDan saya akan lakukan ini secara terbuka & transparan — akan ada serah terima resmi dari perusahaan yang saya undang warga RW 03 Padasuka untuk menyaksikan langsung. Tidak ada yang disembunyikan. 🤝\n-\n📡 SOAL KEAMANAN?\nAman. Sinyal HP yang kita pegang tiap hari pun sama teknologinya. Sudah ada izin resmi Kominfo dan diakui aman oleh WHO. Dokumen bisa dilihat kapanpun.\nSaya lakukan ini semua untuk kepentingan kita bersama. Bukan untuk kepentingan pribadi.\n-\nMari kita dukung bersama dan nantikan undangan serah terima nya 🙏💪\nAda pertanyaan? Hubungi saya langsung 👇	pemukiman	\N	444	terkirim	2026-03-13 21:28:32.895165	444
9	🌧️ INFO WASPADA CUACA RW 03 PADASUKA 🌧️\nSampurasun {gender} {nama} warga {rtxx},\n-\nMelihat kondisi saat ini wilayah kita sedang diguyur hujan yang cukup besar, saya ingin mengimbau warga semuanya untuk tetap waspada ya.\n-\n🏠 Bagi yang sedang di rumah:\nMohon tetap jaga kondisi, pastikan saluran air di sekitar rumah aman, dan perhatikan lingkungan sekitar.\n🛵 Bagi yang sedang berada di luar:\nHarap berhati-hati di jalan, tidak perlu memaksakan diri menembus hujan besar. Silakan cari tempat berteduh yang aman terlebih dahulu.\n-\n⚠️ WASPADA: Mohon kehati-hatian ekstranya untuk seluruh warga, karena pantauan saat ini ada banjir kiriman/aliran air yang cukup deras dari arah atas.\n-\nApabila terjadi genangan air yang mengkhawatirkan atau ada kondisi darurat di wilayah {rtxx}, mohon segera saling berkoordinasi dengan tetangga sekitar atau langsung hubungi layanan/WA RW 03 di nomor: 0895424577140.\n-\nSemoga hujan Malam ini membawa berkah dan lingkungan RW 03 kita dijauhkan dari musibah. Tetap aman dan sehat selalu semuanya!\nWassalamualaikum Warahmatullahi Wabarakatuh,\n-\nSalam hangat,\nRaden Raka\nKetua RW 03 Padasuka	semua	\N	585	terkirim	2026-03-14 12:00:19.065872	585
10	Assalamu'alaikum Wr. Wb. Kepala Keluarga.\n{gender} {warga} Wargi {rtxx} yang terhormat,\n\nSemoga sehat selalu ya.\nSaya mau ingetin nih buat Wargi yang berencana *Mudik lebaran* .\nMohon lapor dulu ke Ketua {rtxx} ya, infokan tanggal berangkat dan kembalinya.\nIni penting banget biar rumah Wargi bisa kita prioritaskan keamanannya.\nJangan lupa juga tips biar mudik tenang:\n1. Matikan listrik yang tidak perlu & cabut colokan alat elektronik.\n2. Kunci semua pintu dan jendela dengan rapat.\n3. Buang sampah sebelum berangkat.\n4. Titip pesan ke tetangga terdekat kalau memungkinkan.\n\nHatur nuhun! 🙏\nRaden Raka - Ketua RW 03 Padasuka	kepala_keluarga	\N	316	terkirim	2026-03-15 21:08:33.547261	316
\.


--
-- Data for Name: warga; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warga (id, kk_id, nama_lengkap, nik, nomor_whatsapp, jenis_kelamin, status_perkawinan, agama, kedudukan_keluarga, tanggal_lahir, pekerjaan, status_kependudukan, created_at, foto_ktp, pendidikan) FROM stdin;
2	2	Djoko Winarso	3277021910640010	08122000991	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-10-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.26496	\N	\N
3	2	Yayah Rukiah	3277025808670017	08122000991	Perempuan	Kawin	Islam	Istri	1967-08-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.26781	\N	\N
4	2	Rizky Geraldy	3277020108000011	08122000991	Laki-laki	Belum Kawin	Islam	Anak	2000-08-01	Karyawan Swasta	Aktif	2026-03-08 17:47:13.271575	\N	\N
5	3	Achmad Taufik	3173010203920004	082179467973	Laki-laki	Kawin	Islam	Kepala Keluarga	1992-03-02	Karyawan Swasta	Aktif	2026-03-08 17:47:13.276837	\N	\N
6	3	Gilda Larassati	3277025301960017	082179467973	Perempuan	Kawin	Islam	Istri	1996-01-13	Karyawan Swasta	Aktif	2026-03-08 17:47:13.279633	\N	\N
7	3	Shaquille Billal Achmad	3277020108210001	082179467973	Laki-laki	Belum Kawin	Islam	Anak	2021-08-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.282128	\N	\N
8	4	Arnia Mayangsari	3277026303890009	08983629302	Perempuan	Kawin	Islam	Istri	1989-03-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.285119	\N	\N
9	4	Zamroni	3277022506840017	089501821026	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-06-25	Karyawan Swasta	Aktif	2026-03-08 17:47:13.287783	\N	\N
1252	412	Ade Priatna	327702312780015	085295495495	Laki-laki	Kawin	Islam	Kepala Keluarga	1978-12-30	Wiraswasta	Aktif	2026-03-12 08:16:38.521977	\N	SLTA/Sederajat
12	4	Azfar Safaroz Idhofi	3277022007120001	08983629302	Laki-laki	Belum Kawin	Islam	Anak	2012-07-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.295909	\N	\N
13	4	Azhira Shaqila Azfania	3277024505150002	08983629302	Perempuan	Belum Kawin	Islam	Anak	2015-05-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.298909	\N	\N
15	1	Yuliawati	3277024403770020	081222245530	Perempuan	Kawin	Islam	Istri	1977-03-04	Wiraswasta	Aktif	2026-03-08 17:47:13.304718	\N	\N
17	6	Jajang Kusmana	3277020607740001	081910038787	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-07-06	Karyawan Swasta	Aktif	2026-03-08 17:47:13.310406	\N	\N
18	6	Enung Kusmayati	3277026509730001	081809912021	Perempuan	Kawin	Islam	Istri	1973-09-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.342265	\N	\N
20	7	Aisya Fadya Haya	3277024605040003	083843222100	Perempuan	Kawin	Islam	Istri	2004-05-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.349031	\N	\N
21	8	Dilah Umbari	3277026411740010	082118833719	Perempuan	Kawin	Islam	Istri	1974-11-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.353264	\N	\N
22	8	Sobirin	3277020703720010	082115607098	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-03-07	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.356149	\N	\N
23	9	Endah Jubaedah	3277024403680001	08999228068	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1968-03-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.358891	\N	\N
24	9	Mochammad Lutfi Faturachman	3277021606010020	089632539347	Laki-laki	Belum Kawin	Islam	Anak	2001-06-16	Karyawan Swasta	Aktif	2026-03-08 17:47:13.36851	\N	\N
25	9	Desy Damayanti	3277024303040001	089647991941	Perempuan	Belum Kawin	Islam	Anak	2004-03-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.376715	\N	\N
26	11	Asep Hendra Permana	3277020101770071	081322345246	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-01-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.381495	\N	\N
27	11	Nurjanah	3277026612810008	089506696182	Perempuan	Kawin	Islam	Istri	1981-02-21	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.390329	\N	\N
28	11	Melanda Dali Mutiara	3277024905060001	089520535338	Perempuan	Belum Kawin	Islam	Anak	2006-05-09	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.393967	\N	\N
29	11	Hafizan Rizky Permana Putra	3277020708160003	089506696182	Laki-laki	Belum Kawin	Islam	Anak	2016-08-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.39652	\N	\N
30	12	Ismail Saputra	3205172707870010	08985249943	Laki-laki	Kawin	Islam	Kepala Keluarga	1987-07-27	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.399389	\N	\N
31	12	Winda Sulastri	3205176606930005	08985249943	Perempuan	Kawin	Islam	Kepala Keluarga	1993-06-26	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.401988	\N	\N
32	12	Anindita Keisha Zahra Ramadhani	3205175806160004	08985249943	Perempuan	Belum Kawin	Islam	Anak	2016-06-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.404988	\N	\N
33	12	Adzkia Salma Nazhira	3277025911220001	08985249943	Perempuan	Belum Kawin	Islam	Anak	2022-11-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.408815	\N	\N
34	12	Reisya Aulia Asiva	3205174103100006	08985249943	Perempuan	Belum Kawin	Islam	Famili Lain	2010-03-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.411391	\N	\N
35	13	Paimin	3273062101580003	082129571676	Laki-laki	Kawin	Islam	Kepala Keluarga	1958-01-21	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.414341	\N	\N
36	13	Mardiah	3273065503530002	082129571676	Perempuan	Kawin	Islam	Istri	1953-03-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.417072	\N	\N
37	13	Joko Noviyanto	3273062111830003	082129571676	Laki-laki	Belum Kawin	Kristen	Anak	1983-11-21	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.419664	\N	\N
38	14	Abdul Syafik	3217070311730001	081221417787	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-11-03	Buruh Pabrik	Aktif	2026-03-08 17:47:13.424131	\N	\N
39	14	Ika Sartika	3217074505740027	0895707699333	Perempuan	Kawin	Islam	Istri	1974-05-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.426599	\N	\N
40	14	Mochamad Farhan	3217071101030012	085759063064	Laki-laki	Belum Kawin	Islam	Anak	2003-01-11	Buruh Pabrik	Aktif	2026-03-08 17:47:13.429547	\N	\N
41	14	Resya Citra Lestari	3217075405080001	083856202956	Perempuan	Belum Kawin	Islam	Anak	2008-05-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.433988	\N	\N
42	14	Aisyah Salsabila Putri	3277025007180004	0895707699333	Perempuan	Belum Kawin	Islam	Anak	2018-07-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.436597	\N	\N
43	10	Ridwan Naluri	3277021611740001	082130694677	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-11-16	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.439033	\N	\N
44	10	Imas Kurniasih	3277016303740001	085921026548	Perempuan	Kawin	Islam	Istri	1974-06-27	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.443144	\N	\N
45	10	Muhammad Azril Aprilyansah	3277010904110001	085921026548	Laki-laki	Belum Kawin	Islam	Anak	2011-04-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.446672	\N	\N
46	15	Cucu Sudiat	3205170702710002	083817981716	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-02-07	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.449046	\N	\N
47	15	Yuyu	3277024606710021	083817981716	Perempuan	Kawin	Islam	Istri	1975-06-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.451136	\N	\N
48	15	Rizki Akmal Insani	3205172804040003	083817981716	Laki-laki	Belum Kawin	Islam	Anak	2004-04-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.453855	\N	\N
49	16	Unah	3277025905590004	085798328764	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1959-05-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.45855	\N	\N
16	1	Raden raka abdul kamal syafaat	3277020603030019	081321133823	Laki-laki	Belum Kawin	Islam	Anak	2003-03-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.307734	/uploads/ktp/1773087727481-g746z5qwwlu.jpeg	\N
19	7	Ari Subahagia	3277010907990026	08996191182	Laki-laki	Kawin	Islam	Kepala Keluarga	1999-07-09	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.34542	\N	\N
50	16	Samsudin	3277022010900024	085798328764	Laki-laki	Belum Kawin	Islam	Anak	1990-10-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.461509	\N	\N
51	17	Yudha Didiet Kristian	3217082608820015	085723033818	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-08-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.463935	\N	\N
52	17	Dewi Anggraeni	3273065303850011	085723033818	Perempuan	Kawin	Islam	Istri	1985-03-13	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.466909	\N	\N
53	17	Muhammad Raka Kasbian	3273061711110002	085708768185	Laki-laki	Belum Kawin	Islam	Anak	2011-11-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.469976	\N	\N
54	17	Muhammad Alfarizqi Dylan	3273060404210002	085723033818	Laki-laki	Belum Kawin	Islam	Anak	2021-04-04	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.473054	\N	\N
55	18	Budianto	3277022109650020	083114092380	Laki-laki	Kawin	Islam	Kepala Keluarga	1965-09-21	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.475708	\N	\N
56	18	IIs	3277025707730016	083114092380	Perempuan	Kawin	Islam	Istri	1973-07-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.479027	\N	\N
57	19	Iwan Setiawan	3277020507970018	083186484101	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-07-05	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.481684	\N	\N
58	18	Indah Nurmalasari	3277025105070007	083114092380	Perempuan	Belum Kawin	Islam	Anak	2007-05-11	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.483888	\N	\N
59	19	Pitria Rahim	3204364206020005	083186484101	Perempuan	Kawin	Islam	Istri	2000-10-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.48641	\N	\N
60	19	Rafa Nurzami	3277020803220003	083186484101	Laki-laki	Belum Kawin	Islam	Anak	2022-03-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.489384	\N	\N
61	20	Misno	3277022002830015	083111428067	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-02-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.492172	\N	\N
62	19	Afnan Syabil	3277021010240003	083186484101	Laki-laki	Belum Kawin	Islam	Anak	2024-10-10	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.494715	\N	\N
63	20	Yuke Puspitayati	3210235810870021	083111428067	Perempuan	Kawin	Islam	Istri	1987-10-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.499703	\N	\N
64	21	Ahi Wirya	3277021012590016	0881022233817	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-12-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.50358	\N	\N
65	20	Risky Yahya Nugraha	3210230112070041	083111428067	Laki-laki	Belum Kawin	Islam	Anak	2007-12-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.506514	\N	\N
66	21	Wowon	3277025110600014	0881022233817	Perempuan	Kawin	Islam	Istri	1960-10-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.509034	\N	\N
67	20	Revina	3210236806120003	083111428067	Perempuan	Belum Kawin	Islam	Anak	2012-06-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.511974	\N	\N
68	20	Muhammad Reyhan Ramadhan	3277021204210003	083111428067	Laki-laki	Belum Kawin	Islam	Anak	2021-04-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.516024	\N	\N
69	22	Zal Fariza	3277025203680002	081947056278	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1968-03-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.518465	\N	\N
70	22	Annisa Nur Luthfiyya	3277025008980017	081947056278	Perempuan	Belum Kawin	Islam	Anak	1998-08-10	Karyawan Swasta	Aktif	2026-03-08 17:47:13.520992	\N	\N
71	23	Saepul Rohman	3277021511720011	081322532670	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-11-15	Karyawan Swasta	Aktif	2026-03-08 17:47:13.523123	\N	\N
72	23	Hendrani Widiarti	3277027107730004	085717572433	Perempuan	Kawin	Islam	Istri	1973-08-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.526	\N	\N
73	23	Fitri Yulia Rahmawati	3277025401000020	085643840618	Perempuan	Belum Kawin	Islam	Anak	2000-01-14	Karyawan Swasta	Aktif	2026-03-08 17:47:13.528499	\N	\N
74	23	Ajeng Karin Khaerani	3277025205040005	081285846915	Perempuan	Belum Kawin	Islam	Anak	2004-05-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.531222	\N	\N
75	23	Karisha Rifda Naila	3277026402100003	0895627166555	Perempuan	Belum Kawin	Islam	Anak	2010-02-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.533759	\N	\N
76	25	Juhana	3277020102560002	089503390058	Laki-laki	Kawin	Islam	Kepala Keluarga	1958-02-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.536639	\N	\N
77	25	Hodijah	3277024406660008	089503390058	Perempuan	Kawin	Islam	Istri	1966-06-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.54211	\N	\N
78	25	Rendi Rohendi	3277021011870001	089503390058	Laki-laki	Belum Kawin	Islam	Anak	1987-11-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.547507	\N	\N
79	25	Rini Rosita	3277026304010008	089503390058	Perempuan	Belum Kawin	Islam	Anak	2001-04-23	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.555024	\N	\N
80	25	Resti Nurfadilah	3277025407040003	089503390058	Perempuan	Belum Kawin	Islam	Anak	2004-07-14	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.561322	\N	\N
81	25	Astri Rodiyah	3277024609100001	089503390058	Perempuan	Belum Kawin	Islam	Anak	2010-09-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.568169	\N	\N
82	26	Sandrawati	3277022812960022	083114092380	Perempuan	Kawin	Islam	Kepala Keluarga	1996-12-28	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.572095	\N	\N
83	26	Muhamad Rizki	3277022304190001	083114092380	Laki-laki	Belum Kawin	Islam	Anak	2019-04-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.574882	\N	\N
84	27	Dede Haryono	3277021706770009	083862874251	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-06-17	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.578595	\N	\N
85	27	Ika Nurjamilah	3277026412790019	083862874251	Perempuan	Kawin	Islam	Istri	1979-12-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.582153	\N	\N
86	24	Rekli Suryanto	3277022505750003	082312912322	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-05-25	Karyawan Swasta	Aktif	2026-03-08 17:47:13.58478	\N	\N
87	27	Putri Salsabila	3277024512030005	083862874251	Perempuan	Belum Kawin	Islam	Anak	2003-12-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.589002	\N	\N
88	24	Erni Nuraeni	3277024710790025	082312912322	Perempuan	Kawin	Islam	Istri	1979-10-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.591839	\N	\N
89	24	Ariibah Nuurul Hudaa	3277026704030001	082312912322	Perempuan	Belum Kawin	Islam	Anak	2003-04-27	Karyawan Swasta	Aktif	2026-03-08 17:47:13.595221	\N	\N
90	24	Muhammad Nizam Al Fathir	3277021807110004	082312912322	Laki-laki	Belum Kawin	Islam	Anak	2011-07-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.598645	\N	\N
91	27	Mochammad Isnaeni Fadhillah	3277022405100001	083862874251	Laki-laki	Belum Kawin	Islam	Anak	2010-05-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.6015	\N	\N
92	28	Heni Andini	3277024310720009	089661039491	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1972-10-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.605844	\N	\N
93	29	Siti Sulastri	3277027112750002	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1975-12-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.608251	\N	\N
94	29	Irfan Syarifuloh	3277021409980001	\N	Perempuan	Belum Kawin	Islam	Anak	1998-09-30	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.610679	\N	\N
95	29	Sinta Ayu Dewintri	3277024306040002	\N	Perempuan	Belum Kawin	Islam	Anak	2004-06-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.613288	\N	\N
96	28	Redi Yudiansah	3277020306980013	088528122220	Laki-laki	Belum Kawin	Islam	Anak	1998-06-03	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.623727	\N	\N
97	29	Celdiana	3277025507080001	\N	Perempuan	Belum Kawin	Islam	Anak	2008-07-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.626555	\N	\N
98	28	Shella Hendriani R	3277025310050002	089661039491	Perempuan	Belum Kawin	Islam	Anak	2005-10-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.629436	\N	\N
99	29	Sifa Aulia Putri	3277027110140003	\N	Perempuan	Belum Kawin	Islam	Anak	2014-10-31	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.632017	\N	\N
100	29	Muhammad Fachri Ramadhan	3277022705180006	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-05-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.634692	\N	\N
101	30	Cecep Julia Iskandariah	3277022907720012	0895415793030	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-07-29	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.637623	\N	\N
102	30	Rini Heryani	3277025411800011	0895415793030	Perempuan	Kawin	Islam	Istri	1980-11-14	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.640187	\N	\N
103	30	Amandha Cantika Putry	3277026710040007	0895415793030	Perempuan	Belum Kawin	Islam	Anak	2004-10-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.642922	\N	\N
104	30	Ananda Jelita Putri	3277025203060004	0895415793030	Perempuan	Belum Kawin	Islam	Anak	2006-03-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.645918	\N	\N
105	30	Adeeva Ayu Putri	3277024210018000	0895415793030	Perempuan	Belum Kawin	Islam	Anak	2018-10-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.649329	\N	\N
106	31	SUKRABAT	3277021002710033	089668379226	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-02-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.652192	\N	\N
107	31	ANI NURANI HANIFAH	3277024705740010	0895338678738	Perempuan	Kawin	Islam	Istri	1974-05-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.654892	\N	\N
108	31	FAJAR FRISTIAN PRADIPTA	3277020904980024	089652269182	Laki-laki	Belum Kawin	Islam	Anak	1998-04-09	Karyawan Swasta	Aktif	2026-03-08 17:47:13.657673	\N	\N
109	31	REZEL REKSA PRADIPTA	3277020809050003	08982782636	Laki-laki	Belum Kawin	Islam	Anak	2005-09-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.660334	\N	\N
110	31	SATRIA RASYA PRADIPTA	3277021310080005	0895338678738	Laki-laki	Belum Kawin	Islam	Anak	2008-10-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.663855	\N	\N
111	32	Nina Priantini	3277024906690010	081387307501	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1969-06-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.666698	\N	\N
112	32	Silvia Gisela	3277025306920023	085150594949	Perempuan	Belum Kawin	Islam	Anak	1992-06-13	Lainnya	Aktif	2026-03-08 17:47:13.669334	\N	\N
113	32	Harvan Nofriendsyah	3277022711050004	0895372764949	Laki-laki	Belum Kawin	Islam	Anak	2005-11-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.671554	\N	\N
114	33	Ade Husen	3277021704750014	089672107743	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-04-17	Wiraswasta	Aktif	2026-03-08 17:47:13.675898	\N	\N
115	33	Lina Marlina	3277025203750018	08972029470	Perempuan	Kawin	Islam	Istri	1975-04-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.67843	\N	\N
116	33	Muthia Azzahra Supriyatna	3277025211020009	08997037408	Laki-laki	Belum Kawin	Islam	Anak	2002-11-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.681582	\N	\N
117	34	Nana Kusnandar	3277022209870008	083110771809	Laki-laki	Kawin	Islam	Kepala Keluarga	1987-09-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.684035	\N	\N
118	34	Ria Dinanti	3277024505910020	083189530620	Perempuan	Kawin	Islam	Istri	1991-05-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.686868	\N	\N
119	34	Nathania Latif Arina Kusnandar	3277026212110001	083189530620	Perempuan	Belum Kawin	Islam	Anak	2011-12-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.689616	\N	\N
120	34	Ilham Aryana Kusnandar	3277022603140002	083189530620	Laki-laki	Belum Kawin	Islam	Anak	2014-03-26	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.693502	\N	\N
121	35	Ahmad Eli BAeli	3277021104620010	087864490346	Laki-laki	Kawin	Islam	Kepala Keluarga	1962-04-11	Pensiunan	Aktif	2026-03-08 17:47:13.696722	\N	\N
122	35	Dian Siti Nurjanah	3277026106750016	087821396838	Perempuan	Kawin	Islam	Istri	1975-06-21	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.699584	\N	\N
123	35	Dilla Nazwa Eldiana	3277024810040003	081803923498	Perempuan	Belum Kawin	Islam	Anak	2004-10-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.702113	\N	\N
124	35	Linda Eldiana	3277026901990008	0896510803523	Perempuan	Belum Kawin	Islam	Anak	1999-01-29	Lainnya	Aktif	2026-03-08 17:47:13.705658	\N	\N
125	36	Isman Rustiadi	3277020603610010	08382181300	Laki-laki	Kawin	Islam	Kepala Keluarga	1961-03-06	Pedagang	Aktif	2026-03-08 17:47:13.709469	\N	\N
126	36	Tri Agustiny	3277026408650008	083850761719	Perempuan	Kawin	Islam	Istri	1965-08-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.712313	\N	\N
127	37	Hendrawan Sukria	3277022612850013	081563153529	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-12-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.715289	\N	\N
128	37	Anita Meliana Wati	3277027103850004	085864917200	Perempuan	Kawin	Islam	Istri	1985-03-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.718292	\N	\N
129	37	Justone Imanuel Rusmana	3277020108080001	083820535968	Laki-laki	Belum Kawin	Islam	Anak	2008-08-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.721749	\N	\N
130	37	Chantika Rani Agistya	3277026908150003	081563153529	Perempuan	Belum Kawin	Islam	Anak	2015-08-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.725324	\N	\N
131	38	Dadan Setiawan	3277021412820011	082130968480	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-12-14	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.727776	\N	\N
132	38	Ai Endai Dainah	3277024102890009	082130968480	Perempuan	Kawin	Islam	Istri	1989-02-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.730871	\N	\N
133	38	Rangga Alifia Setiawan	3277022004120001	082130968480	Laki-laki	Belum Kawin	Islam	Anak	2012-04-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.734198	\N	\N
134	38	Haseena Fauziyah	3277026408210003	082130968480	Perempuan	Belum Kawin	Islam	Anak	2021-08-24	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.742989	\N	\N
135	39	Maria Herawati	3277036511860014	\N	Perempuan	Belum Kawin	Islam	Famili Lain	1986-11-25	Karyawan Swasta	Aktif	2026-03-08 17:47:13.74634	\N	\N
136	39	Ruminah	3277036805510006	\N	Perempuan	Belum Kawin	Islam	Kepala Keluarga	1951-05-28	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.749431	\N	\N
137	40	Iwan Wiryawan	3277021202670017	082129674194	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-02-12	Wiraswasta	Aktif	2026-03-08 17:47:13.754391	\N	\N
138	40	Juli Fifi Sofianti	3277024307690003	081321532375	Perempuan	Kawin	Islam	Istri	1969-07-03	Pensiunan	Aktif	2026-03-08 17:47:13.756951	\N	\N
139	40	Ilham Dwipa Widhiawan	3277020212990020	081383852480	Laki-laki	Belum Kawin	Islam	Anak	1999-12-02	Wiraswasta	Aktif	2026-03-08 17:47:13.760801	\N	\N
140	41	Suryana	3277021505680013	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-05-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.765502	\N	\N
141	41	Tini Widarsih	3277024806720021	089635339625	Perempuan	Kawin	Islam	Istri	1972-06-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.769164	\N	\N
142	41	Gilang Ramadan	3277020703940011	\N	Laki-laki	Belum Kawin	Islam	Anak	1994-03-07	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.772075	\N	\N
143	41	Galih Permana	3277021009960001	\N	Laki-laki	Belum Kawin	Islam	Anak	1996-09-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.775531	\N	\N
144	41	Vina Agnes Liana	3277025306990016	085161155913	Perempuan	Belum Kawin	Islam	Anak	1999-06-13	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.779364	\N	\N
145	41	Tira Berliyana	3211164911050003	\N	Perempuan	Belum Kawin	Islam	Famili Lain	2005-11-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.782708	\N	\N
146	41	Fadilah Salsabila	3211164210110002	\N	Perempuan	Belum Kawin	Islam	Famili Lain	2011-10-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.785601	\N	\N
147	42	Abdul Muin Pattiraja	3277023103640003	081250778675	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-03-31	Wiraswasta	Aktif	2026-03-08 17:47:13.788871	\N	\N
148	42	Hetin Irawati	3277026911790027	081250778675	Perempuan	Kawin	Islam	Istri	1979-11-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.792038	\N	\N
149	42	Devi Rafidah Aisyah	3277026212010011	081250778675	Perempuan	Belum Kawin	Islam	Anak	2001-12-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.795291	\N	\N
150	42	Muhammad Rafii Rabani	3277021310080004	081250778675	Laki-laki	Belum Kawin	Islam	Anak	2008-10-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.798698	\N	\N
151	43	Banyu Aji	3277022710710005	085179668071	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-10-27	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.802107	\N	\N
152	43	Tri Wahyuni	3277025007750039	081394078035	Perempuan	Kawin	Islam	Istri	1975-07-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.805688	\N	\N
153	43	Rakha Fauzan	3277020209040001	081310957004	Laki-laki	Belum Kawin	Islam	Anak	2004-09-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.811537	\N	\N
154	44	Mustopa Kamil	3277022204800011	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-04-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.837323	\N	\N
155	44	Neneng Lia Kartini	3277024309820001	\N	Perempuan	Kawin	Islam	Istri	1982-09-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.841664	\N	\N
156	44	Falia Chantalofa Kamil	3277025802070001	\N	Perempuan	Belum Kawin	Islam	Anak	2007-02-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.850097	\N	\N
157	44	Muhammad Alfarezeul Kamil	3277021402180004	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-02-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.853191	\N	\N
158	45	Yudi Masturi	3277021104700009	081321034073	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-04-11	Karyawan Swasta	Aktif	2026-03-08 17:47:13.855641	\N	\N
159	45	Dina Radianti	3277026812710013	08996930094	Perempuan	Kawin	Islam	Istri	1971-12-28	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.858812	\N	\N
160	45	Muhammad Iqbal Zulfikar	3277020309960014	08996930094	Laki-laki	Belum Kawin	Islam	Anak	1996-09-03	Lainnya	Aktif	2026-03-08 17:47:13.8629	\N	\N
161	45	Muhammad Iqval Zulfansyah	3277021901080006	08996930094	Laki-laki	Belum Kawin	Islam	Anak	2008-01-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.866263	\N	\N
1253	411	ADIBA SILMI KAMILA	3277026203160003	\N	Perempuan	Belum Kawin	Islam	Anak	2016-03-22	Pelajar/Mahasiswa	Aktif	2026-03-12 08:17:23.44317	\N	Tidak/Belum Tamat SD
166	48	Raisya Khairunnisa	3277025910070003	\N	Perempuan	Belum Kawin	Islam	Anak	2007-10-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.885876	\N	\N
167	48	Tatang Daud	3277021305670012	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-05-13	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.889847	\N	\N
168	48	Siti Halimah	3277025212700028	\N	Perempuan	Kawin	Islam	Istri	1970-12-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.893301	\N	\N
169	48	Rizky Adi Saputra	3277020307010017	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-07-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.896491	\N	\N
170	49	ISRA JUMHANI	3277025506730014	082120523095	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-10-18	Wiraswasta	Aktif	2026-03-08 17:47:13.899193	\N	\N
171	50	Enok Jubaedah	3277025209530003	0882002428225	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1953-09-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.902167	\N	\N
172	49	ANISA FITRIYANI	3277024702020028	\N	Perempuan	Belum Kawin	Islam	Anak	2002-02-07	Wiraswasta	Aktif	2026-03-08 17:47:13.904982	\N	\N
173	50	Wawat Susilowati	3277024812700012	0882002428225	Perempuan	Belum Kawin	Islam	Anak	1970-12-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.90847	\N	\N
174	51	Cucun Setiawan	3277021007790002	0882002428225	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-07-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.911797	\N	\N
175	49	WINDA HASANAH	3205145503090003	\N	Perempuan	Belum Kawin	Islam	Famili Lain	2009-03-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.915159	\N	\N
176	51	Yuli Yuliawati	3277025107780001	0882002428225	Perempuan	Kawin	Islam	Istri	1978-07-11	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.918297	\N	\N
177	51	Dara Agnia Putri	3277025101060003	088220473704	Perempuan	Belum Kawin	Islam	Anak	2006-01-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.923558	\N	\N
178	51	Balqis Al Dina	3277026910110003	088220473704	Perempuan	Belum Kawin	Islam	Kepala Keluarga	2011-10-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.927264	\N	\N
179	53	Asep Kurniawan	3277021107810002	081299277642	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-07-11	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.932636	\N	\N
180	53	Santi Mulyati	3277024603850017	081299277642	Perempuan	Kawin	Islam	Istri	1985-03-06	Lainnya	Aktif	2026-03-08 17:47:13.93613	\N	\N
181	53	Rizky Daffa Aldiansyah	3277021105120002	081299277642	Laki-laki	Belum Kawin	Islam	Anak	2012-05-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.945513	\N	\N
182	52	KOMARUDIN	3277022010720015	081383423196	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1972-10-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.952605	\N	\N
183	53	Shakila Nur Sabrina	3277024212180002	081299277642	Perempuan	Belum Kawin	Islam	Anak	2018-12-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.95609	\N	\N
184	54	SARIF HIDAYAT	3203062902000009	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	2000-02-29	Buruh Harian Lepas	Aktif	2026-03-08 17:47:13.959182	\N	\N
185	55	Ahmad Solih	3277020101680005	083142941667	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-01-01	Sopir	Aktif	2026-03-08 17:47:13.96419	\N	\N
186	54	SITI SAROPAH	3217136211990010	085156531273	Perempuan	Kawin	Islam	Istri	1999-11-22	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.967216	\N	\N
187	54	NAYLA SYARIFA NURFADILLAH	3217134608210001	\N	Perempuan	Belum Kawin	Islam	Anak	2021-08-06	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.970991	\N	\N
188	55	Kokom Komariah	3277026610750001	083142941667	Perempuan	Kawin	Islam	Istri	1975-10-26	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.974214	\N	\N
189	55	Komala Solihat	3277024602070005	083142941667	Perempuan	Belum Kawin	Islam	Anak	2007-02-06	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.980382	\N	\N
190	55	Ahmad Hapid Solehudin	3277022106150003	083142941667	Laki-laki	Belum Kawin	Islam	Anak	2015-06-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.984031	\N	\N
191	56	Hatiwa Somantrie	3277022112460003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1946-12-21	Pensiunan	Aktif	2026-03-08 17:47:13.988889	\N	\N
192	56	Entjar Tjarmita	3277025108520005	\N	Perempuan	Kawin	Islam	Istri	1952-08-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:13.992347	\N	\N
193	57	Dicky Hadian Somantrie	3277022608770012	\N	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1977-08-26	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:13.996048	\N	\N
194	59	R. O. Ismail	3277022109300003	\N	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1930-09-21	Pensiunan	Meninggal	2026-03-08 17:47:14.002239	\N	\N
163	46	Cacah	3277024509760023	082130001843	Perempuan	Kawin	Islam	Istri	1976-09-05	Mengurus Rumah Tangga	Aktif	2026-03-08 17:47:13.873745	/uploads/ktp/1773264878574-8cwfvps3i3o.jpeg	Tamat SD/Sederajat
195	58	Reisa Firmansah	3277022607860012	087732020009	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-07-26	Lainnya	Aktif	2026-03-08 17:47:14.008874	\N	\N
196	58	Dini Anggraeni	3277025007840014	087732020009	Perempuan	Kawin	Islam	Istri	1984-07-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.011573	\N	\N
197	58	Keisya Agiska Novia Indah	3277026911070002	087732020009	Perempuan	Belum Kawin	Islam	Anak	2007-11-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.015326	\N	\N
198	58	Reyhan Zikri Firmansah	3277022701120001	087732020009	Laki-laki	Belum Kawin	Islam	Anak	2012-01-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.018839	\N	\N
199	60	Bayu Purwantoro	8171021407910013	0895365109784	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-07-14	TNI	Aktif	2026-03-08 17:47:14.024463	\N	\N
200	58	Kayla Riskya Azzahra	3277025809170001	087732020009	Laki-laki	Belum Kawin	Islam	Anak	2017-09-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.027411	\N	\N
201	60	Ai Epon	3277024605920010	081383495580	Perempuan	Kawin	Islam	Istri	1992-05-06	Karyawan Swasta	Aktif	2026-03-08 17:47:14.030899	\N	\N
202	60	Nadira Putriayu Sabia	3277026106180001	081383495580	Perempuan	Belum Kawin	Islam	Anak	2018-06-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.034125	\N	\N
203	60	Nizar Rafka Adhimakayasa	3277021009220001	081383495580	Laki-laki	Belum Kawin	Islam	Anak	2022-09-10	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.037787	\N	\N
204	61	Iya Satia	3277020101520003	\N	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1952-01-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.043536	\N	\N
205	62	Ace	3277020904570003	081383495580	Laki-laki	Kawin	Islam	Kepala Keluarga	1957-04-09	Petani	Aktif	2026-03-08 17:47:14.04711	\N	\N
206	62	Enis	3277025001630001	081383495580	Perempuan	Kawin	Islam	Kepala Keluarga	1963-01-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.049916	\N	\N
207	63	Nurdin Suherdiman	3277021507770033	087729432148	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-07-15	Pedagang	Aktif	2026-03-08 17:47:14.052827	\N	\N
208	63	Siti Nurhayati	3277025112830012	0895401049688	Perempuan	Kawin	Islam	Istri	1983-12-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.056792	\N	\N
209	64	Indra Agung Permana	3277020510910012	081222240954	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1991-10-05	Karyawan Swasta	Aktif	2026-03-08 17:47:14.060998	\N	\N
210	63	Zacky Aditya Abdul Gani	3277020910070005	0895401049688	Laki-laki	Belum Kawin	Islam	Anak	2007-10-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.064854	\N	\N
211	65	Mukson Ashari	3277020607810023	081223246663	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-07-06	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.068447	\N	\N
212	65	Ruwiyah	3277026005830015	082119910975	Perempuan	Kawin	Islam	Istri	1983-05-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.07407	\N	\N
213	63	Muhamad Aziz Abdul Malik	3277023001180003	0895401049688	Laki-laki	Belum Kawin	Islam	Anak	2018-01-30	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.077101	\N	\N
214	65	Sandi Aditia	3277022008050009	082119910975	Laki-laki	Belum Kawin	Islam	Anak	2005-08-20	Karyawan Swasta	Aktif	2026-03-08 17:47:14.08016	\N	\N
215	63	Rafi Dzakwan Abdul Wiguna	3277022907210002	0895401049688	Laki-laki	Belum Kawin	Islam	Anak	2021-07-29	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.08313	\N	\N
216	65	Leffiana Andira Putri	3277026606110001	082119910975	Perempuan	Belum Kawin	Islam	Anak	2011-06-26	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.08592	\N	\N
217	66	Lili	3277021510640013	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-10-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.088917	\N	\N
218	66	Jujun Kosmiati	3277025012650012	\N	Perempuan	Kawin	Islam	Istri	1965-12-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.091186	\N	\N
219	67	Siti Hasanah	3277026912820007	089687686811	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1982-12-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.094343	\N	\N
220	67	Marilin Mutiara Astuti	3277025503000003	089687686811	Perempuan	Belum Kawin	Islam	Anak	2000-03-15	Karyawan Swasta	Aktif	2026-03-08 17:47:14.099811	\N	\N
221	67	Gustiandy Ayu Krisna Putri Dwi Heppy	3277025008020001	089687686811	Perempuan	Belum Kawin	Islam	Anak	2002-08-10	Karyawan Swasta	Aktif	2026-03-08 17:47:14.103053	\N	\N
222	67	Sarah Cantika	3277024911090001	089687686811	Laki-laki	Belum Kawin	Islam	Anak	2009-11-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.106129	\N	\N
223	68	Achmad Mulyana	3277020305720013	089524551200	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-05-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.109722	\N	\N
224	68	Rani	3277025508800022	089524551200	Perempuan	Kawin	Islam	Istri	1980-08-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.112642	\N	\N
225	68	Randika Maulana	3277023011020020	08815767539	Laki-laki	Belum Kawin	Islam	Anak	2002-11-30	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.116066	\N	\N
226	68	Regina Nur Sabriani	3277025603210002	089524551200	Laki-laki	Belum Kawin	Islam	Anak	2021-03-16	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.120437	\N	\N
227	69	Suryaman	3277031212810011	089652249746	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-12-12	Karyawan Swasta	Aktif	2026-03-08 17:47:14.125287	\N	\N
228	69	Yeni Daryanti	3277034806800013	089652249746	Perempuan	Kawin	Islam	Istri	1980-06-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.130847	\N	\N
229	69	Gilang Surya Pratama	3277030802030001	089652249746	Laki-laki	Belum Kawin	Islam	Anak	2003-02-18	Lainnya	Aktif	2026-03-08 17:47:14.135878	\N	\N
230	70	Acep Sumpena	3277021909820001	089524859030	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-09-19	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.145254	\N	\N
231	70	Siti Romlah	3277025109860001	085703476817	Perempuan	Belum Kawin	Islam	Istri	1986-09-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.152263	\N	\N
232	70	Raifa Azahra	3277024512100001	085703476817	Perempuan	Belum Kawin	Islam	Anak	2010-12-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.158584	\N	\N
233	70	Asifa Nur Zahira	3277026508120001	085703476817	Perempuan	Belum Kawin	Islam	Anak	2012-08-25	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.165565	\N	\N
234	71	Evi Rustiandi	3205312812890001	083140687701	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-12-28	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.171501	\N	\N
235	71	Ika	3217134203940013	083140687701	Perempuan	Kawin	Islam	Istri	1994-03-02	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.177831	\N	\N
236	71	Nadia Peby Aulia Rustandi	3205315202160003	083140687701	Perempuan	Belum Kawin	Islam	Anak	2016-02-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.183812	\N	\N
237	71	Naima Azzahra	3277027009230001	083140687701	Perempuan	Belum Kawin	Islam	Anak	2023-09-30	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.18735	\N	\N
238	72	Desi Marliah	3277024612800001	081322213328	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1980-12-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.191677	\N	\N
239	72	Firyaal Salsabila Ramadhani	3277025810060001	081322213328	Perempuan	Belum Kawin	Islam	Anak	2006-10-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.195833	\N	\N
240	72	Fakhri Faadhillah Akbar	3277020707090004	081322213328	Laki-laki	Belum Kawin	Islam	Anak	2009-07-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.217019	\N	\N
241	72	Muhammad Farhan Ibrahim	3277020301180005	081322213328	Laki-laki	Belum Kawin	Islam	Anak	2018-01-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.224533	\N	\N
1254	412	Ratna Kumala Dewi	3277025209840009	\N	Perempuan	Kawin	Islam	Istri	1984-09-12	Mengurus Rumah Tangga	Aktif	2026-03-12 08:18:30.368042	\N	Diploma I/II
243	73	Rylan Kahlil Nurqholby	3277022806100006	082116415299	Laki-laki	Belum Kawin	Islam	Anak	2010-06-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.23228	\N	\N
244	74	Sugiyarto	3314171108810002	081918667654	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-08-11	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.237632	\N	\N
245	74	Suramti	3277025001780017	08562256551	Perempuan	Kawin	Islam	Istri	1978-01-10	Karyawan Swasta	Aktif	2026-03-08 17:47:14.240685	\N	\N
246	75	Sapardi	3201251503820006	082222264257	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-03-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.243711	\N	\N
247	75	Sukiniyati	3277026201740003	082222264257	Perempuan	Kawin	Islam	Istri	1974-01-22	Karyawan Swasta	Aktif	2026-03-08 17:47:14.247087	\N	\N
248	75	Bayu Prasetyo	3201250209100006	082222264257	Laki-laki	Belum Kawin	Islam	Anak	2010-08-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.250034	\N	\N
249	76	Iyan Diana	3277022011800011	081322260045	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-11-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.253789	\N	\N
250	76	Siti Mariam	3277024806810023	082318192747	Perempuan	Kawin	Islam	Istri	1981-06-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.257055	\N	\N
251	77	Susdiyatiningsih	3277024103540002	087821097414	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1954-03-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.260634	\N	\N
252	78	Bagas Gusfiar	3273092208020002	083150959919	Laki-laki	Kawin	Islam	Kepala Keluarga	2002-08-22	Karyawan Swasta	Aktif	2026-03-08 17:47:14.263772	\N	\N
253	78	Cahyani Sopiati	3277024909030003	083150959919	Perempuan	Kawin	Islam	Istri	2003-09-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.266869	\N	\N
254	78	Arshaka Khairi Mumtaz	3277020704250003	083150959919	Laki-laki	Belum Kawin	Islam	Anak	2025-04-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.269929	\N	\N
255	79	Sopandi	3277022506780022	085794903424	Laki-laki	Kawin	Islam	Kepala Keluarga	1978-06-25	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.273226	\N	\N
256	79	Pipih Siti Patimah	3277024510790017	085794903424	Perempuan	Kawin	Islam	Istri	1979-10-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.276012	\N	\N
257	79	Alya Mutia Azahra	3277025606100005	085794903424	Perempuan	Belum Kawin	Islam	Anak	2010-06-16	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.280082	\N	\N
258	79	Muhammad Akbar Fandiansyah	3277022302160002	085794903424	Laki-laki	Belum Kawin	Islam	Anak	2016-02-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.28274	\N	\N
259	80	Ujang Tohidin	3205171206760005	08316861425	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-07-07	Pedagang	Aktif	2026-03-08 17:47:14.285658	\N	\N
260	80	Santi Susanti	3205174206810006	08316861425	Perempuan	Kawin	Islam	Istri	1977-06-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.288888	\N	\N
261	80	Rizal Geraldi	3205170306960002	08316861425	Laki-laki	Belum Kawin	Islam	Anak	1996-06-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.292219	\N	\N
262	81	Dadan Sutaryana	3277021709840001	087715541516	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-02-17	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.295395	\N	\N
263	81	Dewi Ayu Astuti	3277025208880002	087715541516	Perempuan	Kawin	Islam	Istri	1988-08-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.298163	\N	\N
264	81	WIlda Haura Fauziah	3277026406080004	087715541516	Perempuan	Belum Kawin	Islam	Anak	2008-06-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.300804	\N	\N
265	81	Sofia Maulida Rahmi	3277026312100003	087715541516	Perempuan	Belum Kawin	Islam	Anak	2010-12-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.311553	\N	\N
266	81	Riamsyah Dika Alhasby	3277025002140004	087715541516	Laki-laki	Belum Kawin	Islam	Anak	2014-02-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.3148	\N	\N
267	81	Khaira Septa Azahra	3277024709160005	087715541516	Perempuan	Belum Kawin	Islam	Anak	2016-09-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.317844	\N	\N
268	82	Abid Martanto Hadi	3673011603850008	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-03-16	PNS	Aktif	2026-03-08 17:47:14.321057	\N	\N
269	82	Nia Soniangsih	3673015809840005	\N	Perempuan	Kawin	Islam	Istri	1984-09-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.323979	\N	\N
270	82	Maulina Fathiya Alimah Hadi	3673015903070004	\N	Perempuan	Belum Kawin	Islam	Anak	2007-03-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.326623	\N	\N
271	82	Nazhia Aurelia Abni Hadi	3673015403090004	\N	Perempuan	Belum Kawin	Islam	Anak	2009-03-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.330264	\N	\N
272	82	Ludmilla Navisha Zantisya Hadi	3277024311220001	\N	Perempuan	Belum Kawin	Islam	Anak	2022-11-03	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.333803	\N	\N
273	83	Tuti Triastuti	3277026408620013	085156915602	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1962-08-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.336827	\N	\N
274	83	Qolbi Ayu Al-Haq	3277026701020036	085156915602	Perempuan	Belum Kawin	Islam	Anak	2002-01-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.340977	\N	\N
275	84	Toto Sunarto	3207320706860004	085353386588	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-06-07	Karyawan Swasta	Aktif	2026-03-08 17:47:14.344765	\N	\N
276	84	Dania Fuji Lestari	3207314809880001	085294959566	Perempuan	Kawin	Islam	Istri	1988-09-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.347981	\N	\N
277	84	Arkan Alfian Azmi	3207320703130001	085294959566	Laki-laki	Belum Kawin	Islam	Anak	2013-03-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.352658	\N	\N
278	84	Arsyila Husna Alfathunnisa	3207324907180001	085294959566	Perempuan	Belum Kawin	Islam	Anak	2018-07-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.355659	\N	\N
279	84	Deden Alif Firmansyah	3208250106070001	085353386588	Laki-laki	Belum Kawin	Islam	Famili Lain	2007-06-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.358749	\N	\N
280	85	Tanfidz Syuriansyah	3277020306890002	085220900864	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-06-03	Karyawan Swasta	Aktif	2026-03-08 17:47:14.361657	\N	\N
281	85	Verana Agustine	3204114908910013	085220900864	Perempuan	Kawin	Islam	Istri	1991-08-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.365072	\N	\N
282	85	Muhammad Bin Tanfidz	3276020903160003	085220900864	Laki-laki	Belum Kawin	Islam	Anak	2016-03-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.367797	\N	\N
283	85	Hannah Binti Tanfidz	3277026411170003	085220900864	Perempuan	Belum Kawin	Islam	Anak	2017-11-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.372376	\N	\N
284	85	Asma Binti Tanfidz	3277026904190002	085220900864	Perempuan	Belum Kawin	Islam	Anak	2019-04-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.375277	\N	\N
285	85	Sulaiman Bin Tanfidz	3277021502250002	085220900864	Laki-laki	Belum Kawin	Islam	Anak	2025-02-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.378262	\N	\N
286	6	Nisrina Isnaini Kusma Nur Ainawati	3277025002020012	081809912021	Perempuan	Belum Kawin	Islam	Anak	2002-02-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.381151	\N	\N
287	6	Muhammad Fayesha Kayla Kusmana	3277022009080005	081809912021	Laki-laki	Belum Kawin	Islam	Anak	2008-09-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.385448	\N	\N
288	86	Irsyah Aulia Ashilla	3674065301050006	\N	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	2005-01-13	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.389347	\N	\N
289	86	Keisha Maulidya	3674065210220004	\N	Perempuan	Belum Kawin	Islam	Anak	2022-10-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.392879	\N	\N
290	87	Irwansyah Nugraha	3674061511800005	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-11-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.395618	\N	\N
291	87	Yuniar Febriani	3674065002850012	\N	Perempuan	Kawin	Islam	Istri	1985-02-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.398658	\N	\N
292	87	Raisyah Yuri Nur Qowiy	3674066009140008	\N	Perempuan	Belum Kawin	Islam	Anak	2014-09-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.401756	\N	\N
293	87	Maisyah Alvira Izzatunnisa	3674065010190010	\N	Perempuan	Belum Kawin	Islam	Anak	2019-10-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.404704	\N	\N
294	88	WAWAN SUWANDI	3277021309670017	083189530621	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-09-13	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.40713	\N	\N
295	89	Tuti Erawati	3277021208520023	083189530620	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1954-03-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.410346	\N	\N
296	88	NANI SUAGIARTI	3277025208750001	\N	Perempuan	Kawin	Islam	Istri	1975-08-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.413546	\N	\N
297	88	RIANTI APRILIANI	3277025204040004	\N	Perempuan	Belum Kawin	Islam	Anak	2004-04-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.416513	\N	\N
298	91	Roni Rusmawan	3277021106830025	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-06-11	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.41928	\N	\N
299	91	IMAS RATNA	3277144511770001	083101954978	Perempuan	Kawin	Islam	Istri	1997-11-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.422657	\N	\N
300	91	BILKIS NURHALIZAH	3277025710140006	\N	Perempuan	Belum Kawin	Islam	Anak	2014-10-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.426022	\N	\N
301	90	Saeful Bahri	3205382606690002	081246145421	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-06-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.428708	\N	\N
302	92	RIDWAN	3277031007670015	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-07-10	Karyawan Swasta	Aktif	2026-03-08 17:47:14.431408	\N	\N
303	92	TUJIWATI	3277036408740012	08996915891	Perempuan	Kawin	Islam	Istri	1974-08-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.434644	\N	\N
304	92	MAUDI TRI MEDIA	3277036005030004	\N	Perempuan	Belum Kawin	Islam	Anak	2003-05-02	Karyawan Swasta	Aktif	2026-03-08 17:47:14.436998	\N	\N
305	90	Aih Atikah	3205236810840003	081246145421	Perempuan	Kawin	Islam	Istri	1984-10-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.440381	\N	\N
306	92	SHERLITA AYU SAFITRI	3277036009060005	\N	Perempuan	Belum Kawin	Islam	Anak	2006-09-20	Karyawan Swasta	Aktif	2026-03-08 17:47:14.443258	\N	\N
307	90	Santi Nuraeni	3205236308050001	081246145421	Perempuan	Belum Kawin	Islam	Anak	2005-08-23	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.4473	\N	\N
308	90	Robiyansah	3205231911110002	081246145421	Laki-laki	Belum Kawin	Islam	Anak	2014-02-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.450123	\N	\N
309	92	ALVINO MUHAMAD YUSUF	3277022906090007	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-06-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.453727	\N	\N
310	92	MARSEL RIZKY ALVANO	3277021303140002	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-03-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.456524	\N	\N
311	94	MAKSUM HIDAYAT	3277021903750017	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-03-19	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.459559	\N	\N
312	94	ITA ANGGRAENI	3277024704870017	\N	Perempuan	Kawin	Islam	Istri	1987-04-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.46308	\N	\N
313	93	Ima Rachmawati	3211185412830013	081383830617	Perempuan	Kawin	Islam	Istri	1983-12-14	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.467232	\N	\N
314	93	Denny Supriatna	3273120808770005	081383830617	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-08-08	Karyawan Swasta	Aktif	2026-03-08 17:47:14.471001	\N	\N
315	94	MUHAMMAD GUNAWAN	3277022205060003	\N	Laki-laki	Belum Kawin	Islam	Anak	2006-05-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.475327	\N	\N
316	93	Hazna Havika Putri	3211185310150002	081383830617	Perempuan	Belum Kawin	Islam	Anak	2015-10-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.478634	\N	\N
317	94	AQILA KHOIRUNNISA	3277025810140003	\N	Perempuan	Belum Kawin	Islam	Anak	2014-10-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.481915	\N	\N
318	94	ALIKA MEDINA PUTRI	3277026212210005	\N	Perempuan	Belum Kawin	Islam	Anak	2021-12-22	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.485991	\N	\N
319	96	Jajang Sumarna	3277030111830009	083196693255	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-11-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.489845	\N	\N
320	97	CACA SUARNA	3277020604800007	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-04-06	PNS	Aktif	2026-03-08 17:47:14.494085	\N	\N
321	97	DEDEH SUNENGSIH	3277024609850001	082117931733	Perempuan	Kawin	Islam	Istri	1985-09-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.49792	\N	\N
322	96	Ai Lasnasih	3277024511860001	083185543633	Perempuan	Kawin	Islam	Istri	1986-11-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.502247	\N	\N
323	97	MITA SUCI RAMADHANI	3277027110040001	\N	Perempuan	Belum Kawin	Islam	Anak	2004-10-31	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.505448	\N	\N
324	98	Herman Setiawan	3277020404650018	082116969500	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-04-04	PNS	Aktif	2026-03-08 17:47:14.50889	\N	\N
325	97	HANNUM ALIESHA CANDRA	3277024804200002	\N	Perempuan	Belum Kawin	Islam	Anak	2020-04-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.511562	\N	\N
326	98	Heni Susanti	3277026203700006	082240235065	Perempuan	Kawin	Islam	Istri	1970-03-22	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.513839	\N	\N
327	96	Siti Nur Anjani	3277024801130003	083185543633	Perempuan	Belum Kawin	Islam	Anak	2013-01-08	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.517175	\N	\N
328	96	Raffi Maulana Ariyana	3277021211200001	083185543633	Laki-laki	Belum Kawin	Islam	Anak	2020-11-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.519469	\N	\N
329	98	Debyla Juliana	3277026807040005	082240235065	Perempuan	Belum Kawin	Islam	Anak	2004-07-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.522619	\N	\N
330	99	Latief Muchsimin	3217060308900001	08985599151	Laki-laki	Kawin	Islam	Kepala Keluarga	1990-08-03	Karyawan Swasta	Aktif	2026-03-08 17:47:14.525544	\N	\N
331	99	Sri Susilawati	3277026906900013	08985599151	Perempuan	Kawin	Islam	Istri	1990-06-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.528375	\N	\N
332	99	Muhammad Dimas Jamalul Asyiqiin	3277022810150003	08985599151	Laki-laki	Belum Kawin	Islam	Anak	2015-10-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.530881	\N	\N
333	99	Nadira Yusfina Nursa'idah	3277024810200002	08985599151	Perempuan	Belum Kawin	Islam	Anak	2020-10-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.534081	\N	\N
334	100	IRPAN RUSMANA	3277020608000002	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	2000-08-06	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.536581	\N	\N
335	100	LASMAWATI	3277025512010032	089697366115	Perempuan	Kawin	Islam	Istri	2001-12-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.539559	\N	\N
336	100	QUEENZHA ALMAHYRA RUSMANA	3277024701240003	\N	Perempuan	Belum Kawin	Islam	Anak	2024-01-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.541971	\N	\N
337	101	INA KUSMIATI	3277024708960001	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1998-08-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.54561	\N	\N
338	101	RAFKA PUTRA RAFIANSYAH	3277022101200001	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-01-21	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.548314	\N	\N
339	102	Dadang Jepri	3277020808680037	083151045880	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-08-08	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.55142	\N	\N
340	103	Wisnu Cahyadi	3277012310930011	089660964600	Laki-laki	Kawin	Islam	Kepala Keluarga	1993-10-23	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.554915	\N	\N
341	102	Dandi Setiawan	3277020105050001	083151045880	Laki-laki	Belum Kawin	Islam	Anak	2005-05-27	Karyawan Swasta	Aktif	2026-03-08 17:47:14.558741	\N	\N
342	102	Hafiz Rizki	3277020805120001	083151045880	Laki-laki	Belum Kawin	Islam	Anak	2012-05-08	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.561255	\N	\N
343	103	Salman Hafidz Durahman	3277022105020012	089660964600	Laki-laki	Belum Kawin	Islam	Anak	2002-05-21	Karyawan Swasta	Aktif	2026-03-08 17:47:14.564132	\N	\N
344	104	DANI MAULANA	3204052911840003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-11-29	Karyawan Swasta	Aktif	2026-03-08 17:47:14.566702	\N	\N
345	103	Shafa Nurul Syarifah	3277024907070002	089660964600	Perempuan	Belum Kawin	Islam	Anak	2007-07-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.569907	\N	\N
346	104	ELI MARISA	3204056909840002	089637590906	Perempuan	Kawin	Islam	Istri	1984-09-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.572968	\N	\N
347	103	Rafha Nur Sofian	3277022809170004	089660964600	Laki-laki	Belum Kawin	Islam	Anak	2017-09-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.576186	\N	\N
348	104	ANINDYA ZAHRA MAULANA	3204054411090004	\N	Perempuan	Belum Kawin	Islam	Anak	2009-11-04	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.579312	\N	\N
349	104	DAFFA AZKA YUSUF	3204050511140001	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-11-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.58223	\N	\N
350	105	Titin Suhartini	3277024905750022	08986058404	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1975-05-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.584563	\N	\N
351	104	ADZKIA AFSHEEN ZAYBA MAULANA	3277024906210001	\N	Perempuan	Belum Kawin	Islam	Anak	2021-06-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.587499	\N	\N
352	105	Azizah Nur Baitie	3277025811190005	08986058404	Perempuan	Belum Kawin	Islam	Anak	2019-11-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.593066	\N	\N
353	106	Osbal Marpaung	3217060501710015	085759710306	Laki-laki	Kawin	Kristen	Kepala Keluarga	1971-01-05	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.597107	\N	\N
354	106	Jetty Pasaribu	3217066412690014	085759710306	Perempuan	Kawin	Kristen	Istri	1969-12-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.600019	\N	\N
355	106	Christina Marpaung	3217064903960011	085759710306	Perempuan	Belum Kawin	Kristen	Anak	1996-03-09	Karyawan Swasta	Aktif	2026-03-08 17:47:14.604043	\N	\N
356	106	Fernando Marpaung	3217060101990089	085759710306	Laki-laki	Belum Kawin	Kristen	Anak	1999-01-01	Karyawan Swasta	Aktif	2026-03-08 17:47:14.607066	\N	\N
357	106	Jonathan Marpaung	3217062305060007	085759710306	Laki-laki	Belum Kawin	Kristen	Anak	2006-05-23	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.610122	\N	\N
358	106	Novita Marpaung	3217065711070003	085759710306	Perempuan	Belum Kawin	Kristen	Anak	2007-11-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.613334	\N	\N
359	106	Kevin Marpaung	3217062804130006	085759710306	Laki-laki	Belum Kawin	Kristen	Anak	2013-04-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.624117	\N	\N
360	107	Ahmad Iwan Ridwan	3277020602780002	08990805260	Laki-laki	Kawin	Islam	Kepala Keluarga	1978-02-06	Karyawan Swasta	Aktif	2026-03-08 17:47:14.626988	\N	\N
361	107	Ani Sutiarni	3277026503760002	0895326812518	Perempuan	Kawin	Islam	Istri	1976-03-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.630058	\N	\N
362	107	Viona Chairunnisa	3277027012020001	0895338328442	Perempuan	Belum Kawin	Islam	Anak	2002-12-30	Lainnya	Aktif	2026-03-08 17:47:14.633007	\N	\N
363	107	Vina Meisa Azahra	3277026005080003	0895404722613	Perempuan	Belum Kawin	Islam	Anak	2008-05-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.636683	\N	\N
364	107	Muhammad Irsyad Almuzaki	3277020503100003	0895421604600	Laki-laki	Belum Kawin	Islam	Anak	2010-03-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.639851	\N	\N
365	108	Yejen Suryaman	3172021911650003	081573551358	Laki-laki	Kawin	Islam	Kepala Keluarga	1965-11-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.643266	\N	\N
366	108	Meiske Nurhayati	3172024305680002	081573551358	Perempuan	Kawin	Islam	Istri	1968-05-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.646058	\N	\N
367	108	Rachmah Niar	3172027011000012	089639602320	Perempuan	Belum Kawin	Islam	Anak	2000-11-30	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.649886	\N	\N
368	108	Rachmah Pratiwi	3172025110081002	085877264255	Perempuan	Belum Kawin	Islam	Anak	2008-10-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.652338	\N	\N
369	109	Asep Muhamad Ramdhan	3277020807810013	085624313436	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1981-07-08	Karyawan Swasta	Aktif	2026-03-08 17:47:14.656628	\N	\N
370	109	Azhar Rafli Radita Ramdhan	3277022404070008	089531509608	Laki-laki	Belum Kawin	Islam	Anak	2007-04-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.659387	\N	\N
371	110	Titin Rosmaya	3277026512640002	085798136910	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1964-12-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.662871	\N	\N
372	110	Muhammad Zein Sab'a	3277022609050006	085798136910	Laki-laki	Belum Kawin	Islam	Anak	2005-09-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.666154	\N	\N
373	111	Darja	3376041204860004	087872888834	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-04-12	Wiraswasta	Aktif	2026-03-08 17:47:14.669203	\N	\N
374	111	Rina Safitri	3322126302970002	0817133834	Perempuan	Kawin	Islam	Istri	1997-02-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.671704	\N	\N
375	111	Septian Hidayatullah	3376041001180002	0817133834	Laki-laki	Belum Kawin	Islam	Anak	2018-01-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.67418	\N	\N
376	112	Yudi Kresna Wijaya	3277022507760021	085697753746	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-07-25	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.677762	\N	\N
377	112	Ari Astriani	3276054310870007	085697753746	Perempuan	Kawin	Islam	Istri	1987-10-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.681156	\N	\N
378	112	Mahardika Wijaya	3277020709140006	085697753746	Laki-laki	Belum Kawin	Islam	Anak	2014-09-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.684222	\N	\N
379	112	Ricky Maulana Yusuf	3277020806160002	085697753746	Laki-laki	Belum Kawin	Islam	Anak	2016-06-08	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.686803	\N	\N
380	112	Arya Wijaya	3277021312170001	085697753746	Laki-laki	Belum Kawin	Islam	Anak	2017-12-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.690668	\N	\N
381	114	Yani Haryani	3277026208820023	083142005960	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1982-08-22	Karyawan Swasta	Aktif	2026-03-08 17:47:14.695776	\N	\N
382	114	Muhammad Andhika Yuda Pratama	3277020305090001	083131154462	Laki-laki	Belum Kawin	Islam	Anak	2009-05-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.6991	\N	\N
383	114	Siti Andhini Yuri Pratiwi	3277024305090001	081210659373	Perempuan	Belum Kawin	Islam	Anak	2009-05-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.701958	\N	\N
384	115	SAKRIANTO	3277020604540008	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1954-04-06	Pensiunan	Aktif	2026-03-08 17:47:14.705326	\N	\N
385	115	MURNIATI	3277024512540014	\N	Laki-laki	Kawin	Islam	Istri	1954-12-05	Pensiunan	Aktif	2026-03-08 17:47:14.710264	\N	\N
386	116	Dwi Kristiyanto	3204161509860002	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-09-15	Lainnya	Aktif	2026-03-08 17:47:14.712951	\N	\N
387	116	Ina Marlina	3277026303880013	\N	Perempuan	Kawin	Islam	Istri	1988-03-23	Karyawan Swasta	Aktif	2026-03-08 17:47:14.71563	\N	\N
388	117	DWI KRISTIN MURNIA SAKRIANTO	3277025902840012	082214471037	Perempuan	Kawin	Islam	Istri	1984-02-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.718067	\N	\N
389	116	Shafiyyah Najwa Almirah	3277025807150005	\N	Perempuan	Belum Kawin	Islam	Anak	2015-07-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.720952	\N	\N
390	118	Endang Heryana	3277020102670010	082129165555	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-02-01	Wiraswasta	Aktif	2026-03-08 17:47:14.723365	\N	\N
391	118	Ajeng Meilania. Md	3207335005850001	082119199564	Perempuan	Kawin	Islam	Istri	1985-05-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.725835	\N	\N
392	117	SYAH REZA NURKURNIALLAHI	3277012002970011	081931430089	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-02-20	Wiraswasta	Aktif	2026-03-08 17:47:14.728429	\N	\N
393	118	Shafa Alivia Azahra	3277025509030004	081213998794	Perempuan	Belum Kawin	Islam	Anak	2003-09-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.73117	\N	\N
394	113	Asad Al Taryat	3277020502390003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1939-02-05	Pensiunan	Aktif	2026-03-08 17:47:14.736385	\N	\N
395	118	Muhamad Dhafin Rayhan	3277020505070003	081320252935	Laki-laki	Belum Kawin	Islam	Anak	2007-05-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.739574	\N	\N
396	113	Meli	3277024507320003	\N	Perempuan	Kawin	Islam	Istri	1932-07-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.743949	\N	\N
397	118	Khansa Ardanareswari	3277026009140003	082129165555	Perempuan	Belum Kawin	Islam	Anak	2014-09-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.74629	\N	\N
398	118	Muhamad Arfan Darren	3277020912210004	082129165555	Laki-laki	Belum Kawin	Islam	Anak	2021-12-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.748686	\N	\N
399	119	Usep Ma’mun	3277021511590005	082120021959	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-11-15	Karyawan Swasta	Aktif	2026-03-08 17:47:14.751153	\N	\N
400	119	Siti Juariah	3277025010610034	081222247639	Perempuan	Kawin	Islam	Istri	1961-10-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.753562	\N	\N
401	121	Asep Mulyana	3277031701800006	08136361780	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-01-17	Karyawan Swasta	Aktif	2026-03-08 17:47:14.756454	\N	\N
402	121	Tipah Supriatih	3277037006830002	081320208396	Perempuan	Kawin	Islam	Istri	1988-06-30	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.758842	\N	\N
403	120	Eko Amboina Somantrie	3277021405810017	081312309909	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-05-14	Karyawan Swasta	Aktif	2026-03-08 17:47:14.761355	\N	\N
404	120	Reka Lelyana Hussey	3273225110830002	081312309909	Perempuan	Kawin	Islam	Istri	1983-10-11	Karyawan Swasta	Aktif	2026-03-08 17:47:14.764002	\N	\N
405	121	Davis Andriawan	3277031308040008	081320208396	Laki-laki	Belum Kawin	Islam	Anak	2004-08-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.766374	\N	\N
406	121	Sesilia Putri	3277035410100001	081320208396	Perempuan	Belum Kawin	Islam	Anak	2010-10-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.769401	\N	\N
407	120	Hasby Adnan Alhusayn Somantrie	3277020302240003	081312309909	Laki-laki	Belum Kawin	Islam	Anak	2024-02-03	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.772073	\N	\N
408	121	Tasya Arsheeva Qareen	3277027010140003	081320208396	Perempuan	Belum Kawin	Islam	Anak	2014-10-30	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.775571	\N	\N
409	122	EEM SULAEMAN	3277020810530006	083854136870	Laki-laki	Kawin	Islam	Kepala Keluarga	1953-10-08	Pensiunan	Aktif	2026-03-08 17:47:14.779056	\N	\N
410	122	DEWI HERAWATI	3277025512590007	08989219079	Perempuan	Kawin	Islam	Istri	1956-12-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.782513	\N	\N
411	123	Kusman Maulid Diana	3277022812830025	081220600050	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-12-28	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.785174	\N	\N
412	122	ATHEERA NAURA NABIQHO	3277026911030002	\N	Perempuan	Belum Kawin	Islam	Famili Lain	2003-11-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.788012	\N	\N
413	123	Ella Karmila	3273176605930001	081220600050	Perempuan	Kawin	Islam	Istri	1993-05-26	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.791185	\N	\N
414	123	Alfhin Khoerul Pratama	3277022108120005	089603293929	Laki-laki	Belum Kawin	Islam	Anak	2012-08-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.805625	\N	\N
415	123	Raisha Putri Diana	3277024905190004	081220600050	Perempuan	Belum Kawin	Islam	Anak	2019-05-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.809099	\N	\N
416	124	YAYA SUKRIYA	3277021701600002	087824098620	Laki-laki	Kawin	Islam	Kepala Keluarga	1960-01-17	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.812052	\N	\N
417	125	Kurniawan	3277031606880002	085287587579	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-06-16	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.81564	\N	\N
418	126	Wahab Rambe	3277020809720015	085793966254	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-09-08	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.818613	\N	\N
419	125	Razkha Sofyan Syauri	3277031201140001	0895636922340	Laki-laki	Belum Kawin	Islam	Anak	2014-01-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.821362	\N	\N
420	125	Alfarizqi Rayhaan Shakeil	3277021709200001	0895636922340	Laki-laki	Belum Kawin	Islam	Anak	2020-09-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.824101	\N	\N
421	128	Agus Hambani	3277020503660001	081321175707	Laki-laki	Kawin	Islam	Kepala Keluarga	1966-03-05	Pedagang	Aktif	2026-03-08 17:47:14.828028	\N	\N
422	128	Ai Komarawati	3217104308660003	08122444655	Perempuan	Kawin	Islam	Istri	1966-06-03	Pedagang	Aktif	2026-03-08 17:47:14.830959	\N	\N
423	127	RIKI MURDANI	3277031809920004	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1992-09-18	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.834138	\N	\N
424	127	SINTA ANGGARAENI	3277027012920010	0895356101051	Laki-laki	Kawin	Islam	Istri	1992-12-30	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.837503	\N	\N
425	129	Henny Hermawati	3277026308650015	087887888198	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1965-08-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.841562	\N	\N
426	129	Muhammad Naufal Feryanto	3277021202000009	0895377340906	Laki-laki	Belum Kawin	Islam	Anak	2000-02-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.844093	\N	\N
427	130	Ade Rahmat	3277020305440001	08975860443	Laki-laki	Kawin	Islam	Kepala Keluarga	1944-05-03	Pensiunan	Aktif	2026-03-08 17:47:14.846606	\N	\N
428	127	ARASELY AGNETA FARZANA	3217034308170002	\N	Perempuan	Belum Kawin	Islam	Anak	2017-08-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.850601	\N	\N
429	130	Tuti Resnawati	3277025309670008	08975860443	Perempuan	Kawin	Islam	Istri	1967-09-13	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.853656	\N	\N
430	127	RAFFASYA ARCELIO FARZAN	3217030905230004	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-05-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.857832	\N	\N
431	127	KAL ALGHIFARI FARZAN	3217032504190001	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-04-25	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.861096	\N	\N
432	126	Riana Uli Simbolon	3277025808510013	085793966254	Perempuan	Kawin	Islam	Istri	1981-05-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.864728	\N	\N
433	126	Yazka Al-Fatih Rambe	3277020203020009	085793966254	Laki-laki	Belum Kawin	Islam	Anak	2002-03-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.869364	\N	\N
434	126	Muhammad Aqlauna Rambe	3277020403090004	085793966254	Laki-laki	Belum Kawin	Islam	Anak	2009-03-04	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.872353	\N	\N
435	131	Ani Suhartini	3217064811690011	083176332465	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1969-11-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.874931	\N	\N
436	131	Kayla Nur Az Zahra	3277025511120002	083176332465	Perempuan	Belum Kawin	Islam	Anak	2012-11-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.877755	\N	\N
1170	390	MUHNANDAR	3277022303540007	087825030454	Laki-laki	Kawin	Islam	Kepala Keluarga	1954-03-23	Pensiunan	Aktif	2026-03-11 08:29:52.52275	\N	\N
442	28	Resa Adriyana	3277022006950020	089661039491	Laki-laki	Belum Kawin	Islam	Anak	1995-06-20	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.895838	\N	\N
443	134	Siti Khairani	3277024305730022	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1973-05-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.898271	\N	\N
444	134	Nur Umi Khoerunisa	3277025609990006	\N	Perempuan	Belum Kawin	Islam	Anak	1999-09-15	Karyawan Swasta	Aktif	2026-03-08 17:47:14.900795	\N	\N
445	135	Usep Sudrajat	3277021603640010	082240201569	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-03-16	Wiraswasta	Aktif	2026-03-08 17:47:14.903451	\N	\N
446	135	LIA MULYADEWI	3277025004750023	081802009445	Perempuan	Kawin	Islam	Istri	1975-04-10	Karyawan Swasta	Aktif	2026-03-08 17:47:14.906037	\N	\N
447	135	MUHAMMAD FAUZI NUR HIDAYATULLAH SUDRAJAT	3277021702011001	087825915657	Laki-laki	Belum Kawin	Islam	Anak	2001-02-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.909554	\N	\N
448	134	Muhammad Fadil Febrian	3277021002040003	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-02-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.91186	\N	\N
449	135	AHMAD FAUZAAN NUR HIDAYATULLAH SUDJARAT	3277022501050003	081818240915	Laki-laki	Belum Kawin	Islam	Anak	2005-01-25	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.915093	\N	\N
450	135	AHMAD FAUZIAH NUR HIDAYATULLAH SUDRAJAT	3277022103090004	087825915657	Laki-laki	Belum Kawin	Islam	Anak	2009-03-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.917435	\N	\N
451	136	Toto Ardianto	3205170905900002	083121091251	Laki-laki	Kawin	Islam	Kepala Keluarga	1990-05-09	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.919935	\N	\N
452	136	Eneng Mimin Kurniasih	3205174211910006	082217337536	Perempuan	Kawin	Islam	Istri	1991-11-02	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.922828	\N	\N
453	136	Rasya Cakra Wijaksana	3205171310140002	083121091251	Laki-laki	Belum Kawin	Islam	Anak	2014-10-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.926258	\N	\N
454	136	Faeyza Daviandra Ardiaz	3277020610220004	082217337536	Laki-laki	Belum Kawin	Islam	Anak	2022-10-06	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.929615	\N	\N
455	137	GATOT HERMANTO KALISMAN	3277021502700015	08122378737	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-12-15	Karyawan BUMN	Aktif	2026-03-08 17:47:14.932895	\N	\N
456	137	AGUSTINA	3277025408730037	081214803207	Perempuan	Kawin	Islam	Istri	1973-08-14	Guru	Aktif	2026-03-08 17:47:14.935119	\N	\N
457	137	MUHAMMAD DHIWA SATRIAZKA HERMANTO	3277020408030004	081220492028	Laki-laki	Belum Kawin	Islam	Anak	2003-08-04	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.937957	\N	\N
458	138	Didi Iswara	3277020501700021	085793867516	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-01-05	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.94094	\N	\N
459	138	Isah Aisah	3277026010750001	085861907624	Perempuan	Kawin	Islam	Istri	1975-10-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.944022	\N	\N
460	137	MUHAMMAD DHAFIN AZKA RIZQAMADHAN	3277022610050004	0982130315941	Laki-laki	Kawin	Islam	Anak	2005-10-26	POLRI	Aktif	2026-03-08 17:47:14.947229	\N	\N
461	138	Andriyani Dadang Bastiar	3277022011940001	085793867516	Laki-laki	Belum Kawin	Islam	Anak	1994-02-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.949942	\N	\N
462	138	Andini Akhirul Laeli	3277026008030008	085871094085	Perempuan	Belum Kawin	Islam	Anak	2003-09-19	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.952931	\N	\N
463	137	Sismeni	3277024211650001	081320929172	Perempuan	Belum Kawin	Islam	Famili Lain	1965-11-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.956223	\N	\N
464	139	Sodikin	3328040703760001	087821312121	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1976-03-07	Pedagang	Aktif	2026-03-08 17:47:14.959399	\N	\N
465	139	Ika Susanti	3328045010840006	0881022179677	Perempuan	Kawin	Islam	Istri	1984-10-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.962358	\N	\N
466	140	RIYADATUL	3277021406890010	085861377050	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-06-14	Karyawan Swasta	Aktif	2026-03-08 17:47:14.965281	\N	\N
467	139	Aimar Akhmad Sodikin	3328040611150003	087821312121	Laki-laki	Belum Kawin	Islam	Anak	2015-11-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.969578	\N	\N
468	140	ANGGRAENI KURNIA	3273124312880001	085720535770	Perempuan	Kawin	Islam	Istri	1988-12-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.972378	\N	\N
469	140	SHEIKA MOZA GHOSSANI BAZLA	3277025301170003	\N	Perempuan	Belum Kawin	Islam	Anak	2017-01-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.975803	\N	\N
470	140	AZFAR ELKHAN DAMANTA	3277022803240001	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-03-28	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:14.980014	\N	\N
471	141	Ambara Sri Handayani	3277025610620006	087720006888	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1962-10-16	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.983414	\N	\N
472	143	METI DIAN HERAWATI	3277025510710017	081220828969	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1971-10-15	Guru	Aktif	2026-03-08 17:47:14.986599	\N	\N
473	144	Sapari	3277022606760039	083199643876	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1976-06-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:14.989265	\N	\N
474	143	NADHIFA DHIRA KHAIRUNNISA	3277025802040002	\N	Perempuan	Belum Kawin	Islam	Anak	2004-02-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.992355	\N	\N
475	144	Muhamad Rizki Sapari	3277021912100004	0831	Laki-laki	Belum Kawin	Islam	Anak	2010-12-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:14.995784	\N	\N
476	143	NAZHIIF DHIRA KHAIRULLAH	3277022301070003	\N	Laki-laki	Belum Kawin	Islam	Anak	2007-01-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.000101	\N	\N
477	144	Nesya Hajara	3277025003190004	083199643876	Perempuan	Belum Kawin	Islam	Anak	2019-03-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.003	\N	\N
478	145	Parmin E Ruhiyat	3277021812660015	081321887841	Laki-laki	Kawin	Islam	Kepala Keluarga	1966-12-18	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.005832	\N	\N
479	146	ELIS WIDANINGSIH	3277021210210002	089655801655	Perempuan	Kawin	Islam	Istri	1980-05-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.009019	\N	\N
480	145	Lena Maryati	3273056904700005	08122153761	Perempuan	Kawin	Islam	Istri	1970-04-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.011568	\N	\N
481	146	DADAN SOFYAN	3277022404760034	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-04-24	Karyawan Swasta	Aktif	2026-03-08 17:47:15.014601	\N	\N
482	145	Septian Muhdiana Fajar	3277020609920008	0895332820334	Laki-laki	Belum Kawin	Islam	Anak	1992-09-06	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.020778	\N	\N
483	146	ADINDA DELA SOFIANI	3277026303030004	089627051388	Perempuan	Belum Kawin	Islam	Anak	2003-03-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.023596	\N	\N
439	133	Sadiah	3277025007750043	088971211715	Perempuan	Kawin	Islam	Istri	1975-07-10	Ibu Rumah Tangga	Pindah	2026-03-08 17:47:14.887849	\N	\N
438	133	Agus Sutansyah	3277020506690034	088971211715	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-06-05	Buruh Harian Lepas	Pindah	2026-03-08 17:47:14.883576	\N	\N
440	133	Rian Permana	3277020803960007	088971211715	Laki-laki	Belum Kawin	Islam	Anak	1996-03-08	Karyawan Swasta	Pindah	2026-03-08 17:47:14.890642	\N	\N
441	133	Adam Sobari	3277023110160002	088971211715	Laki-laki	Belum Kawin	Islam	Anak	2016-10-31	Pelajar/Mahasiswa	Pindah	2026-03-08 17:47:14.893126	\N	\N
484	146	ADLIE FAIRUZ SOFYAN	3277021104150002	\N	Laki-laki	Belum Kawin	Islam	Anak	2015-04-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.026971	\N	\N
485	148	Heri Rustiadji Abdullah	3277022604620005	087823537014	Laki-laki	Kawin	Islam	Kepala Keluarga	1962-04-26	Pensiunan	Aktif	2026-03-08 17:47:15.030116	\N	\N
486	148	Rosmala	3277025508680001	085794556311	Perempuan	Kawin	Islam	Istri	1968-08-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.03309	\N	\N
487	148	Muhammad Aldin Fahreza Abdullah	3277020710980008	087745641616	Laki-laki	Belum Kawin	Islam	Anak	1998-10-07	Karyawan Swasta	Aktif	2026-03-08 17:47:15.036053	\N	\N
488	148	Hana Maryam Kamilia	3277026711020012	085730410589	Perempuan	Belum Kawin	Islam	Anak	2002-11-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.038815	\N	\N
489	148	Tiara Nazwa Nurazizah	3277024506040002	083183106569	Perempuan	Belum Kawin	Islam	Anak	2004-06-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.042707	\N	\N
490	149	ARIEF GINANJAR	3217061702850005	081111861725	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-02-17	Karyawan Swasta	Aktif	2026-03-08 17:47:15.045862	\N	\N
491	149	SINTA RAHMAWATI	3277034810900009	08977877272	Perempuan	Kawin	Islam	Istri	1990-10-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.049659	\N	\N
492	149	AZKA ALFAREL GINANJAR	3277021208150001	\N	Laki-laki	Belum Kawin	Islam	Anak	2015-08-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.052975	\N	\N
493	149	AZKYA PUTRI GINANJAR	3277025702180004	\N	Perempuan	Belum Kawin	Islam	Anak	2018-02-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.055949	\N	\N
494	149	ATTA ALFIANDRA GINANJAR	3277022909230001	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-09-29	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.058778	\N	\N
495	150	Muhammad Faisal	3277022305980009	083130468115	Laki-laki	Kawin	Islam	Kepala Keluarga	1998-05-23	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.063163	\N	\N
496	151	Imam Syahri	3277020304790016	083822306260	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-04-03	Pedagang	Aktif	2026-03-08 17:47:15.065986	\N	\N
497	150	Zisha Azhar Ambardiazka	3217065309980002	083821872005	Perempuan	Belum Kawin	Islam	Istri	1998-09-13	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.06881	\N	\N
498	151	Ai Wawang	3277024109730016	083822306260	Perempuan	Kawin	Islam	Istri	1973-09-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.072252	\N	\N
499	151	Fiki Firmansyah	3277021508030001	083822306260	Laki-laki	Belum Kawin	Islam	Anak	2003-08-15	Karyawan Swasta	Aktif	2026-03-08 17:47:15.075873	\N	\N
500	153	SYAHRUL GINTING	1207230602830002	081322118253	Laki-laki	Kawin	Kristen	Kepala Keluarga	1983-02-06	Karyawan Swasta	Aktif	2026-03-08 17:47:15.078354	\N	\N
501	151	Lena Aulia Ramadhina	3277026009070004	083822306260	Perempuan	Belum Kawin	Islam	Anak	2007-09-20	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.081033	\N	\N
502	153	DAMEITA PURBA	1207237005880005	085275114479	Perempuan	Kawin	Kristen	Istri	1988-05-30	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.083953	\N	\N
503	153	VIONA NEURY EIZHEE GINTING	1207236401180004	\N	Perempuan	Belum Kawin	Kristen	Anak	2018-01-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.086866	\N	\N
504	154	Mochamad Ervin	3217070101970002	085624401898	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1997-01-01	Karyawan Swasta	Aktif	2026-03-08 17:47:15.089632	\N	\N
505	155	Ratminah	3277024101380002	083822306260	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1938-01-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.092881	\N	\N
506	157	Suhendar	3205170605840007	089612333903	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1984-05-06	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.097535	\N	\N
507	156	ARIS MUNANDAR	3277022805750015	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-08-28	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.100218	\N	\N
508	157	Agnia Nurfauziah	3205175704120002	089612333903	Perempuan	Belum Kawin	Islam	Anak	2012-04-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.10566	\N	\N
509	156	ILAH	3277025903760025	083161821541	Perempuan	Kawin	Islam	Istri	1976-03-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.108353	\N	\N
510	159	Muhammad Irfan Nugraha Kamil	3277022405920002	081322958282	Laki-laki	Kawin	Islam	Kepala Keluarga	1992-05-24	PNS	Aktif	2026-03-08 17:47:15.111097	\N	\N
511	159	Mutiara Delasyifaa Rachmadi	3273016912950003	085721749914	Perempuan	Kawin	Islam	Istri	1995-12-29	Karyawan Swasta	Aktif	2026-03-08 17:47:15.113543	\N	\N
512	159	Nuha Kilima Ulayya Kamil	3277026412210004	081322958282	Perempuan	Belum Kawin	Islam	Anak	2021-12-24	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.116428	\N	\N
513	161	Sri Wahyuni	3277024711820020	087796539820	Perempuan	Kawin	Islam	Istri	1982-11-02	Karyawan Swasta	Aktif	2026-03-08 17:47:15.119761	\N	\N
514	161	Yudi Rodiana	3217062401880007	087796539820	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-01-24	Karyawan Swasta	Aktif	2026-03-08 17:47:15.124548	\N	\N
515	160	T. TRESNA NINGSIH	3277025102520001	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1952-02-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.12774	\N	\N
516	161	Anggela Pratama Chandra Dewi Happy	6301034508030002	087796539820	Perempuan	Belum Kawin	Islam	Anak	2002-06-06	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.130345	\N	\N
517	158	Joko Mulyono	3372052111750006	0895631891313	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-11-21	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.132996	\N	\N
518	158	Suryanti	3372055604740012	083139645408	Perempuan	Kawin	Islam	Istri	1974-04-16	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.135286	\N	\N
519	158	Muhammad Fabian Putra Utama	3217061901040002	083139645408	Laki-laki	Belum Kawin	Islam	Anak	2004-01-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.137717	\N	\N
520	158	Marsya Della Joyantika	3217064503060013	081297749061	Perempuan	Kawin	Islam	Anak	2006-03-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.141004	\N	\N
521	158	Dherik Satria Pamungkas	3372052803080001	083159563283	Laki-laki	Belum Kawin	Islam	Anak	2008-03-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.144187	\N	\N
522	158	Muhammad Alfatih  Hibatilah	3277021212230001	081297749061	Laki-laki	Belum Kawin	Islam	Cucu	2023-12-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.147144	\N	\N
523	162	Dian Ridwansyah	3277021503710013	08935441382	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-03-15	Karyawan Swasta	Aktif	2026-03-08 17:47:15.149518	\N	\N
524	162	Neny Sumarni	3277026610700015	082126927180	Perempuan	Kawin	Islam	Istri	1970-10-26	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.151683	\N	\N
525	162	Bagas Waladini Abdilah	3277022201980024	082121183100	Laki-laki	Belum Kawin	Islam	Anak	1998-01-22	Karyawan Swasta	Aktif	2026-03-08 17:47:15.154223	\N	\N
526	162	Salsa Affita Putri	3277026610030001	081223557056	Perempuan	Belum Kawin	Islam	Anak	2003-10-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.156456	\N	\N
527	163	Tedi Tarmedi	3209070909820005	08997037837	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-09-09	Pedagang	Aktif	2026-03-08 17:47:15.158878	\N	\N
528	163	Sri Mulyani	3209075209720007	083185542287	Perempuan	Kawin	Islam	Istri	1976-09-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.161755	\N	\N
529	163	Vikry Teguh Firmansyah	3209070901040002	089647991942	Laki-laki	Belum Kawin	Islam	Anak	2004-01-09	Karyawan Swasta	Aktif	2026-03-08 17:47:15.164661	\N	\N
530	163	Muhamad Rizky Firmansyah	3209071705060003	081312668366	Laki-laki	Belum Kawin	Islam	Anak	2006-05-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.167787	\N	\N
531	163	Zesica Aulia	3209076706100005	0895402218133	Perempuan	Belum Kawin	Islam	Anak	2010-06-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.170966	\N	\N
532	163	Silvia Oktaviani	3209076910120002	083167280236	Perempuan	Belum Kawin	Islam	Anak	2012-10-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.173295	\N	\N
533	164	Beny Ali Wibowo	3277020711730013	08122138515	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-11-07	Karyawan BUMN	Aktif	2026-03-08 17:47:15.176253	\N	\N
534	164	Atik Choirun Niswah	3277024402870009	081575588199	Perempuan	Kawin	Islam	Istri	1987-02-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.181555	\N	\N
535	164	Faishal MUzhaki Wibowo	3277022505030004	081221388515	Laki-laki	Belum Kawin	Islam	Anak	2003-05-25	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.184307	\N	\N
536	164	Syadad Ash Shiddiqi Wibowo	3277020709080003	081575588199	Laki-laki	Belum Kawin	Islam	Anak	2008-09-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.186684	\N	\N
537	165	Maman	3277022012630009	081321522292	Laki-laki	Kawin	Islam	Kepala Keluarga	1963-12-20	Wiraswasta	Aktif	2026-03-08 17:47:15.189086	\N	\N
538	165	Ida	3277027108670010	082116164070	Perempuan	Kawin	Islam	Istri	1967-08-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.193533	\N	\N
539	165	Rika Febriyani Permana	3277025302930010	081321522292	Perempuan	Belum Kawin	Islam	Anak	1993-02-13	Karyawan Swasta	Aktif	2026-03-08 17:47:15.196231	\N	\N
540	165	Rizki Adika Permana	3277022604990007	081321522292	Laki-laki	Belum Kawin	Islam	Anak	1999-04-26	Karyawan Swasta	Aktif	2026-03-08 17:47:15.198776	\N	\N
541	165	Siska Agisla Permana	3277025308050004	082116164070	Perempuan	Belum Kawin	Islam	Anak	2005-08-13	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.201039	\N	\N
542	165	Daffa Adelio Permana	3277021209110002	082116164070	Laki-laki	Belum Kawin	Islam	Anak	2011-09-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.204443	\N	\N
543	176	Euis Herwani	3277026006600010	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1960-06-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.207301	\N	\N
544	166	Tri Wahyu Hadi	3277021802650006	081324454145	Laki-laki	Kawin	Islam	Kepala Keluarga	1965-02-18	PNS	Aktif	2026-03-08 17:47:15.21063	\N	\N
545	166	Desi Dwi Dasarani Mahiyanti	3277026012740003	081324454145	Perempuan	Kawin	Islam	Istri	1974-12-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.215417	\N	\N
546	166	Hasya Rasheeva Hadi	3277025410050001	\N	Perempuan	Belum Kawin	Islam	Anak	2005-10-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.218512	\N	\N
547	166	Hariska Faika Hadi	3277026306120005	\N	Perempuan	Belum Kawin	Islam	Anak	2012-06-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.221384	\N	\N
548	169	Philip Rehata	3277022411590010	082115522557	Laki-laki	Kawin	Kristen	Kepala Keluarga	1959-11-24	Pensiunan	Aktif	2026-03-08 17:47:15.224115	\N	\N
549	169	Dwi Restiyani	3277027001640007	082115522577	Perempuan	Kawin	Islam	Istri	1964-01-30	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.22706	\N	\N
550	169	David Widodo Rehatta	3277020505860016	082115522577	Laki-laki	Belum Kawin	Kristen	Anak	1986-05-05	Wiraswasta	Aktif	2026-03-08 17:47:15.23331	\N	\N
551	169	Alexander Rehatta	3277021301920006	\N	Laki-laki	Belum Kawin	Kristen	Anak	1992-01-13	Karyawan Swasta	Aktif	2026-03-08 17:47:15.236314	\N	\N
552	169	Brenda Lestari Rehatta	3277025511000025	\N	Perempuan	Belum Kawin	Islam	Anak	2000-11-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.238959	\N	\N
553	169	Yoandhika Surya Putra	1571036906010061	\N	Laki-laki	Belum Kawin	Islam	Famili Lain	2002-06-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.241914	\N	\N
554	167	Dadan Subandi	3277021812590014	0811249461	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1959-12-18	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.24482	\N	\N
555	167	Mimin Suminar	3277025907780006	082118148820	Perempuan	Kawin	Islam	Istri	1978-07-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.24749	\N	\N
556	167	Yanwar Anugrah Subandi	3277022101010019	0811249461	Laki-laki	Belum Kawin	Islam	Anak	2001-01-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.250296	\N	\N
557	167	Dhafin Nurzakka Subandi	3277021910070006	082118148820	Laki-laki	Belum Kawin	Islam	Anak	2007-10-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.253153	\N	\N
558	167	Dheniyas Arbie Subandi	3277020711090007	0811249461	Laki-laki	Belum Kawin	Islam	Anak	2009-11-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.256273	\N	\N
559	142	Maryati	3277024312580010	081223245454	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1958-12-03	Pensiunan	Aktif	2026-03-08 17:47:15.258962	\N	\N
560	177	Suja'i	3273061112690003	081318465144	Laki-laki	Kawin	Islam	Lainnya	1969-12-11	Karyawan Swasta	Aktif	2026-03-08 17:47:15.262192	\N	\N
561	177	Soliah	3273066107760006	081318465144	Perempuan	Kawin	Islam	Kepala Keluarga	1976-07-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.265186	\N	\N
562	177	Rival Harrist Febriansyah	3273062202000004	081806259009	Laki-laki	Belum Kawin	Islam	Anak	2000-02-22	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.267701	\N	\N
563	177	Winda Witri Wulandari	3273064807020001	082127168994	Perempuan	Belum Kawin	Islam	Anak	2002-07-08	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.270376	\N	\N
564	178	Jaka Mahesa	3277020110880014	085720376119	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-10-01	Karyawan Swasta	Aktif	2026-03-08 17:47:15.273165	\N	\N
565	178	Wulansari	3277027103900008	085720376119	Perempuan	Kawin	Islam	Istri	1990-03-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.275826	\N	\N
566	178	Ryu Fayyadl Mahesa	3277021401200006	085720376119	Laki-laki	Belum Kawin	Islam	Anak	2020-01-14	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.279079	\N	\N
567	179	Alan Herawati	3277024403490002	0895360566609	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1949-03-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.284543	\N	\N
568	180	Edy Yusuf	3277022006600018	082130664006	Laki-laki	Kawin	Islam	Kepala Keluarga	1960-06-20	Pensiunan	Aktif	2026-03-08 17:47:15.291084	\N	\N
569	180	Aan Diana	3277024810650023	081320456365	Perempuan	Kawin	Islam	Istri	1965-10-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.295813	\N	\N
570	181	Elsie Arisandy	3277024901910004	082129997091	Perempuan	Kawin	Islam	Kepala Keluarga	1991-01-09	Dokter	Aktif	2026-03-08 17:47:15.298881	\N	\N
571	181	Sefa Alsava Elnusana	3277025711200003	082129997091	Perempuan	Belum Kawin	Islam	Anak	2020-11-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.301443	\N	\N
572	181	Sharga Atharva Elnusana	3277020110230001	082129997091	Laki-laki	Belum Kawin	Islam	Anak	2023-10-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.304174	\N	\N
573	182	Riswantika	3217090304790029	089505608677	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-04-03	Lainnya	Aktif	2026-03-08 17:47:15.306791	\N	\N
574	182	Ani Mulyani	3277025008710019	08986196103	Perempuan	Kawin	Islam	Istri	1971-08-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.309236	\N	\N
575	183	Tuti Hartini	3277015906710031	0882000482903	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1971-06-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.313206	\N	\N
576	183	Fadly Dwi Kurnia Riyanto	3277020308080009	088218404493	Laki-laki	Belum Kawin	Islam	Anak	2008-08-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.315607	\N	\N
577	183	Fiona Eka Rahmalia Hartini	3277024308080002	0882001081344	Perempuan	Belum Kawin	Islam	Anak	2008-08-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.318145	\N	\N
578	184	Iwan Ridwan	3277022006710018	0895700906351	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-06-20	Karyawan Swasta	Aktif	2026-03-08 17:47:15.321337	\N	\N
579	184	Sri Nurhayati	3277024601760001	08992848431	Perempuan	Kawin	Islam	Istri	1976-01-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.324108	\N	\N
580	184	Alfiyah Nahdah	3277024512040004	08986166807	Perempuan	Belum Kawin	Islam	Anak	2004-12-05	Karyawan Swasta	Aktif	2026-03-08 17:47:15.328814	\N	\N
581	184	Salfina Oktavia	3277024510120002	089654048832	Perempuan	Belum Kawin	Islam	Anak	2011-10-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.333938	\N	\N
582	185	Apan Suparman	3277021603590012	088224509802	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-03-16	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.338902	\N	\N
584	185	Henny Agustiny Suparman	3277025208880009	085978005492	Perempuan	Belum Kawin	Islam	Anak	1988-08-18	Karyawan Swasta	Aktif	2026-03-08 17:47:15.348114	\N	\N
585	186	Riky Sundawan Sukandar	3277022010700010	081321321515	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-10-20	Karyawan BUMN	Aktif	2026-03-08 17:47:15.351642	\N	\N
586	186	Iin Indriati	3277025209770023	085221564235	Perempuan	Kawin	Islam	Istri	1977-09-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.354548	\N	\N
587	186	Hanifa Salma	3277026209040003	085221564235	Perempuan	Belum Kawin	Islam	Anak	2004-09-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.357255	\N	\N
588	186	Maulvi Muthahhari	3277022309040001	085221564235	Laki-laki	Belum Kawin	Islam	Anak	2004-09-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.3602	\N	\N
589	186	Qaneyta Maryam	3277026311180002	085221564235	Perempuan	Belum Kawin	Islam	Anak	2018-11-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.364141	\N	\N
590	173	Muhammad Chandra Purnama	3277021203950015	08112211456	Laki-laki	Kawin	Islam	Kepala Keluarga	1995-03-12	Karyawan Swasta	Aktif	2026-03-08 17:47:15.367344	\N	\N
591	173	Ma'arij	3204107112940003	08112211459	Perempuan	Kawin	Islam	Istri	1994-12-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.370116	\N	\N
592	173	Mikhayla Isyana Abigail	3277024712220001	08112211459	Perempuan	Belum Kawin	Islam	Anak	2022-12-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.373164	\N	\N
593	187	ACEP DARYAT	3277023110750017	08988209305	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1975-10-31	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.376109	\N	\N
594	187	MIRA AYUSARI	3277024704020009	\N	Perempuan	Belum Kawin	Islam	Anak	2002-04-07	Buruh Pabrik	Aktif	2026-03-08 17:47:15.379465	\N	\N
595	175	Gretha Paulina Manongko	3277024811580013	081214151338	Perempuan	Cerai Mati	Kristen	Kepala Keluarga	1958-11-08	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.382344	\N	\N
596	175	Gusti Ayu Magdalifie Fransiska Wulantrisna	3277026309780011	081214151338	Perempuan	Cerai Mati	Islam	Anak	1978-09-23	Karyawan Swasta	Aktif	2026-03-08 17:47:15.385027	\N	\N
597	188	SUMARNA	3277020101820066	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-01-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.388034	\N	\N
598	188	DEDE RATNA TARYANI	3277027105890001	083190712316	Perempuan	Kawin	Islam	Istri	1989-05-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.392369	\N	\N
599	188	DESI ARYANI SUMARNA	3277026812110001	\N	Perempuan	Belum Kawin	Islam	Anak	2011-12-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.395423	\N	\N
600	172	Oxka Ferdiansyah	1671041310830010	081320222251	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-10-13	Wiraswasta	Aktif	2026-03-08 17:47:15.400259	\N	\N
601	188	MUHAMMAD NUR FADILLAH	3277022806170001	\N	Laki-laki	Belum Kawin	Islam	Anak	2017-06-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.402975	\N	\N
602	172	Farros Fauzan	3277022001020017	081320222251	Laki-laki	Belum Kawin	Islam	Anak	2002-01-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.405532	\N	\N
603	172	Ellis Darwati	3277024506800001	081320222251	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1980-06-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.40801	\N	\N
604	189	TANTAN HARDIANSAH	3277022503850030	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-03-25	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.41036	\N	\N
605	171	Hendri Christian	3277023107740014	081320309883	Laki-laki	Kawin	Katolik	Kepala Keluarga	1974-07-31	Karyawan Swasta	Aktif	2026-03-08 17:47:15.413518	\N	\N
606	189	ELIS YATI DARYATI	327702650388000`	083190416402	Perempuan	Kawin	Islam	Istri	1988-03-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.416198	\N	\N
607	171	Maria Mustikawati	3277026407770013	081320309883	Perempuan	Kawin	Katolik	Istri	1977-07-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.418645	\N	\N
608	189	JAELANI JAYA KUSUMA	3277020310080007	\N	Laki-laki	Belum Kawin	Islam	Anak	2008-10-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.421903	\N	\N
609	189	MELINDA TANIA INDRIANSYAH	3277024605160001	\N	Perempuan	Belum Kawin	Islam	Anak	2016-05-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.42426	\N	\N
610	171	Hillarion Gerard Christian	3277022608060005	\N	Laki-laki	Belum Kawin	Katolik	Anak	2006-08-26	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.427034	\N	\N
611	171	Hillary Gwen Christian	3277027007100003	\N	Perempuan	Belum Kawin	Katolik	Anak	2010-07-30	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.429222	\N	\N
612	190	DADANG SUHERMAN	3277020405680003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-05-04	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.432722	\N	\N
613	190	ENAR	3277024404710001	\N	Perempuan	Kawin	Islam	Istri	1973-04-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.435565	\N	\N
614	170	Ricky Hermawan	3277020601880010	081220713630	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-01-06	POLRI	Aktif	2026-03-08 17:47:15.438583	\N	\N
615	170	Yulia Rizkiani	3277024207880007	081909560908	Perempuan	Kawin	Islam	Istri	1988-07-02	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.442047	\N	\N
616	190	RAMDANI	3277021505060005	\N	Laki-laki	Belum Kawin	Islam	Anak	2006-05-16	Buruh Pabrik	Aktif	2026-03-08 17:47:15.445396	\N	\N
617	170	Ghyta Shaqila Tazkia	3217065101140007	\N	Perempuan	Belum Kawin	Islam	Anak	2014-01-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.448422	\N	\N
618	170	Ghaitsa Shaqueena Zaskiya	3277026310170002	\N	Perempuan	Belum Kawin	Islam	Anak	2001-10-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.453443	\N	\N
619	191	ASEP CAHYA	3277020312970015	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-12-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.456584	\N	\N
620	191	AAS ASMAWATI	3217084910990014	089502554214	Perempuan	Kawin	Islam	Istri	1999-10-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.459815	\N	\N
621	192	Gusti Raymond Yudisthira Ray	3277022004770013	081905307518	Laki-laki	Cerai Hidup	Kristen	Kepala Keluarga	1977-04-20	Karyawan Swasta	Aktif	2026-03-08 17:47:15.462672	\N	\N
622	191	NADIRA ASYA AZZAHRA	3277025507240002	\N	Perempuan	Belum Kawin	Islam	Anak	2024-07-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.465909	\N	\N
623	192	Gusti Bryan Gennaro Samindra	3276021502100004	\N	Laki-laki	Belum Kawin	Kristen	Anak	2010-02-15	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.468444	\N	\N
624	193	ASEP ASRI SETIAWAN	3214010310000002	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	2000-11-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.471885	\N	\N
625	193	DEWI FITRIANA	3277024708000001	085724685301	Perempuan	Kawin	Islam	Istri	2000-08-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.475852	\N	\N
626	125	Neulis Suryani	3277026104880021	0895636922340	Perempuan	Kawin	Islam	Istri	1988-04-21	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.478555	\N	\N
627	194	Viki Dzikir Anugrah	3277021905930001	081284266517	Laki-laki	Kawin	Islam	Kepala Keluarga	1993-05-19	Karyawan Swasta	Aktif	2026-03-08 17:47:15.481397	\N	\N
628	193	LASERRA AZRA EMILY SETIAWAN	3277025606230004	\N	Perempuan	Belum Kawin	Islam	Anak	2023-06-16	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.484588	\N	\N
629	194	Leni Lestariah	7271015411970004	081284266517	Perempuan	Kawin	Islam	Istri	1997-11-14	Bidan	Aktif	2026-03-08 17:47:15.48714	\N	\N
630	194	Humaira Syafa Anugrah	3277024305240005	081284266517	Perempuan	Belum Kawin	Islam	Anak	2024-05-03	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.492863	\N	\N
631	124	Nunung Rohaeti	3277024604650013	083878617464	Perempuan	Kawin	Islam	Istri	1965-04-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.495278	\N	\N
632	196	YANA ROMANDA	3277022212760006	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-12-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.499954	\N	\N
633	196	AGNES NILA PERMATA	3277026108770020	082116836503	Perempuan	Kawin	Islam	Istri	1977-08-21	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.503742	\N	\N
634	196	SABRIL QALAMUMULAIL	3277024707050007	\N	Perempuan	Belum Kawin	Islam	Anak	2005-01-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.506219	\N	\N
635	160	Andrean Zihad Zulfikar	3277020907940016	\N	Laki-laki	Belum Kawin	Islam	Cucu	1994-07-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.516615	\N	\N
636	196	ALHADIDILMI	3277020907080002	\N	Laki-laki	Belum Kawin	Islam	Anak	2008-07-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.52045	\N	\N
637	160	Hanny Marisa Marwan	3271066106080007	\N	Perempuan	Belum Kawin	Islam	Cucu	2008-06-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.525965	\N	\N
638	197	Susi Emasriani	3277025012660040	\N	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1966-12-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.530028	\N	\N
639	198	Nano Rusmana	3277023011830012	085703539020	Laki-laki	Kawin	Islam	Kepala Keluarga	1983-11-30	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.551244	\N	\N
640	198	Fini Hartini	3277027108830015	085323217797	Perempuan	Kawin	Islam	Istri	1983-08-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.555358	\N	\N
641	198	Aditya Affansyah Rusmana	3277021106090001	085798117572	Laki-laki	Belum Kawin	Islam	Anak	2009-06-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.560023	\N	\N
642	198	Natasya Salsabila Azzahra Rusmana	3277025112140001	085323217797	Perempuan	Belum Kawin	Islam	Anak	2014-12-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.563397	\N	\N
643	199	Rohmat	3277021301750007	081313803315	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-01-13	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.566867	\N	\N
644	199	Wati Hermawati	3277025604780007	081313803315	Perempuan	Kawin	Islam	Istri	1978-04-16	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.570776	\N	\N
645	199	Adhyansha Nugraha Abdilah	3277021807130001	081313803315	Laki-laki	Belum Kawin	Islam	Anak	2013-07-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.573664	\N	\N
646	199	Nayara Nuha Zahira	3277027103170001	081313803315	Perempuan	Belum Kawin	Islam	Anak	2017-03-31	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.576726	\N	\N
647	200	Herni Handayani	3277024401690007	082116555169	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1969-01-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.581295	\N	\N
648	201	Yani Mulyani	3217144606820024	0895389979461	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1982-06-06	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.584343	\N	\N
649	201	Sayyid Fatih Ibadurohman Al-Basit	3217140905150003	0895389979461	Laki-laki	Belum Kawin	Islam	Anak	2015-05-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.586932	\N	\N
650	201	Ramadhan Mujahid Al Mumtaz	3217140504220003	0895389979461	Laki-laki	Belum Kawin	Islam	Anak	2022-04-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.589702	\N	\N
651	202	Cepi Hermawan	3277022011740008	\N	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1974-11-20	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.594118	\N	\N
652	202	Renatha Putri Audine	3203074207120006	\N	Perempuan	Belum Kawin	Islam	Anak	2017-07-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.59729	\N	\N
653	202	Wiranatha Putra Audine	3203071709180001	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-09-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.600426	\N	\N
654	203	Ermawati	3277024707720018	082317599657	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1972-07-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.603378	\N	\N
655	203	Hibatul Wafi	3277021602990001	0971502361582	Laki-laki	Belum Kawin	Islam	Anak	1999-02-16	Karyawan Swasta	Aktif	2026-03-08 17:47:15.607429	\N	\N
656	204	Mochamad Ramdan	3273071109760018	083832186971	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-09-11	Karyawan Swasta	Aktif	2026-03-08 17:47:15.610535	\N	\N
657	204	Rani Mulyani	3273077003850004	083832186971	Perempuan	Kawin	Islam	Istri	1985-03-30	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.613413	\N	\N
658	205	HENDRA HERMAWAN	3273030212850007	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-12-02	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.616044	\N	\N
659	205	SHERLY AMELIA	3273034404860015	082119000324	Perempuan	Kawin	Islam	Istri	1986-04-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.619929	\N	\N
660	204	Muhammad Daffa Dhaawii Ramdani	3273071102090004	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-02-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.622771	\N	\N
661	205	MOHAMMMAD FADLAN	3273030307050003	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-07-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.625548	\N	\N
662	205	DAFINZA AUROFU FINAZKA	3273030201090003	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-01-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.628205	\N	\N
663	205	ADZAKY NAUFAL HAMZANI	3273031412150003	\N	Laki-laki	Belum Kawin	Islam	Anak	2015-12-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.630587	\N	\N
664	204	Arya Fauzan Ramdani	3273070101120001	\N	Laki-laki	Belum Kawin	Islam	Anak	2012-01-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.633316	\N	\N
665	204	Ibrahim Azzam Ramdani	3277020101180002	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-01-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.636026	\N	\N
666	204	Muhammad Arkana Ramdani	3277020108220005	\N	Laki-laki	Belum Kawin	Islam	Anak	2022-08-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.639183	\N	\N
667	206	DADIN SUDARMAN	3217141306840008	081572538217	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-06-13	Karyawan Swasta	Aktif	2026-03-08 17:47:15.642149	\N	\N
668	206	FURY RHUBIANTI	3277025204950012	\N	Perempuan	Kawin	Islam	Istri	1995-04-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.646412	\N	\N
669	206	ALIA SALMA NAFISHA	3277024109200004	\N	Perempuan	Belum Kawin	Islam	Anak	2020-09-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.651515	\N	\N
670	207	Satria Andika Putra	3277030908920007	081563934061	Laki-laki	Kawin	Islam	Kepala Keluarga	1992-06-09	Karyawan Swasta	Aktif	2026-03-08 17:47:15.654446	\N	\N
671	208	AGUS ASALIM	3277021708690030	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-08-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.657701	\N	\N
672	208	AAN SURYANI	3277025804760007	0895634598908	Perempuan	Kawin	Islam	Istri	1976-04-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.660599	\N	\N
673	208	KEIRA RAHMA PUTRI	3277024703100001	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-03-07	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.664982	\N	\N
674	210	MOCHAMAD RENAULT	3277020206940010	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1994-06-02	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.667832	\N	\N
675	211	Yana Komarudin	3277021504640008	089610176900	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-04-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.670766	\N	\N
676	210	EPI RIANA	3217154111960002	081563834609	Perempuan	Kawin	Islam	Istri	1997-08-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.674043	\N	\N
677	212	Alika Septie Budiman	3277020509070007	085860605992	Perempuan	Belum Kawin	Islam	Anak	2007-09-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.676915	\N	\N
678	212	Iyep Supriatna	3277021906690021	085860605992	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-06-19	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.680894	\N	\N
679	210	CALBELLA NISA SOFEA	3277024204190004	\N	Perempuan	Belum Kawin	Islam	Anak	2019-04-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.683675	\N	\N
680	212	Dynamo Junior Putra	3277021806240001	085860605992	Laki-laki	Belum Kawin	Islam	Anak	2024-06-18	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.686439	\N	\N
681	212	Nuryanti	3277026306860001	085860605992	Perempuan	Kawin	Islam	Istri	1986-06-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.695839	\N	\N
682	209	Noneng	3277025212670024	0895633267676	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1967-12-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.699353	\N	\N
683	213	Ahmad Rusdana	3277021506670004	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-06-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.702794	\N	\N
684	211	Yati Sumiati	3277026710700007	089610176900	Perempuan	Kawin	Islam	Istri	1970-10-27	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.705393	\N	\N
685	213	WALIAH	3277027107720010	081287661895	Perempuan	Kawin	Islam	Istri	1972-07-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.708598	\N	\N
686	211	Mochamad Sidik Jaelani	3277022309990012	089610176900	Laki-laki	Belum Kawin	Islam	Menantu	1999-09-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.712054	\N	\N
687	213	ASTRIE JUNIA	3277025506070003	\N	Perempuan	Belum Kawin	Islam	Anak	2007-06-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.714603	\N	\N
688	211	Hasnah Novianti	3277025811080004	083840740241	Perempuan	Belum Kawin	Islam	Anak	2008-11-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.717626	\N	\N
689	211	Novan Risqi Nugraha	3277020111140004	089610176900	Laki-laki	Belum Kawin	Islam	Anak	2014-11-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.720501	\N	\N
690	207	Farah Chandra Muchlis	1305016803010003	081563934061	Perempuan	Belum Kawin	Islam	Istri	2001-03-28	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.724033	\N	\N
691	207	Hagia Miraine Triafa	3277026912250002	\N	Perempuan	Belum Kawin	Islam	Anak	2025-12-29	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.726775	\N	\N
692	214	Sri Wahyuningsih	3277035612640004	081563934061	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1964-12-16	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.732544	\N	\N
693	215	Maman	3277020308690021	08985599151	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1969-08-03	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.737893	\N	\N
694	215	Sela Stepia	3277026504050006	08985599151	Perempuan	Belum Kawin	Islam	Anak	2005-04-25	Karyawan Swasta	Aktif	2026-03-08 17:47:15.741083	\N	\N
695	217	Yuhaitika	3217065104570005	082130900269	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1957-04-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.744542	\N	\N
696	219	Raden Sentot Kumara	3277022807720019	083101126637	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-07-28	Karyawan Swasta	Aktif	2026-03-08 17:47:15.748172	\N	\N
697	219	Devi Affianty	3277025004740016	083101126637	Perempuan	Kawin	Islam	Istri	1974-09-10	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.751304	\N	\N
698	219	Mohammad Akshal Rahmat Kumara	3277021804010021	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-04-18	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.754461	\N	\N
699	219	Raisa Talitha Mutiara	3277026804060008	\N	Perempuan	Belum Kawin	Islam	Anak	2006-04-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.756988	\N	\N
700	220	Ade Komarudin	3277022203680007	083841517567	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-03-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.760332	\N	\N
701	220	Mujiati	3277024111700001	083841517567	Perempuan	Belum Kawin	Islam	Istri	1970-11-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.762954	\N	\N
702	220	Aji Muhammad Ilyas	3277021504010001	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-04-15	Guru	Aktif	2026-03-08 17:47:15.765899	\N	\N
703	221	Adam Mandawa Putra	3217060705970001	085156182049	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-05-07	Karyawan Swasta	Aktif	2026-03-08 17:47:15.769578	\N	\N
704	221	Erva Viani	3277026903970001	085720283205	Perempuan	Kawin	Islam	Istri	1997-03-29	Karyawan Swasta	Aktif	2026-03-08 17:47:15.772184	\N	\N
705	222	Sumpena	3277020701740010	089524349500	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-01-07	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.775777	\N	\N
706	222	Dede Sutarsah	3277025806750005	089523439500	Perempuan	Kawin	Islam	Istri	1975-08-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.779173	\N	\N
707	222	Ananda Rizky Sumpena	3277025409050001	\N	Perempuan	Belum Kawin	Islam	Anak	2005-09-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.783546	\N	\N
708	223	Rudi Mardiantoro	3217072810740003	081214321906	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-10-28	Karyawan BUMN	Aktif	2026-03-08 17:47:15.786806	\N	\N
709	223	Fitria Rusmawati	3217074202990021	081214321906	Perempuan	Kawin	Islam	Istri	1999-02-02	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.790086	\N	\N
710	223	Reynaldi Pratama Saputra	3217070812960008	\N	Laki-laki	Belum Kawin	Islam	Anak	1996-12-08	Karyawan Swasta	Aktif	2026-03-08 17:47:15.795086	\N	\N
711	223	Reynita Octaviani	3217075510000012	\N	Perempuan	Belum Kawin	Islam	Anak	2000-10-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.79811	\N	\N
712	223	Nuri Paira Sintia	3277025704170005	\N	Perempuan	Belum Kawin	Islam	Anak	2017-04-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.802009	\N	\N
713	224	Cepy Sulaeman	3277021603970020	082115335959	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1997-03-26	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.804823	\N	\N
714	225	Heru Kurniawan	3277021005960011	082117942424	Laki-laki	Kawin	Islam	Kepala Keluarga	1996-05-10	Karyawan Swasta	Aktif	2026-03-08 17:47:15.807574	\N	\N
715	225	Kireina Mahreen Almashyra	3277024511250001	082117942424	Perempuan	Belum Kawin	Islam	Anak	2025-11-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.810881	\N	\N
716	227	Gumilang	3277011409910015	089656556636	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-09-14	Wiraswasta	Aktif	2026-03-08 17:47:15.814422	\N	\N
717	227	Tiara Shofa Nastarine	3204374510930017	089656556636	Perempuan	Kawin	Islam	Istri	1993-10-05	Guru	Aktif	2026-03-08 17:47:15.817523	\N	\N
718	227	Gibran Al Fatih Gumilang	3277011205190001	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-05-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.823341	\N	\N
719	228	Wawan Mulyadi	3277022505750034	087779605642	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-05-24	Wiraswasta	Aktif	2026-03-08 17:47:15.826331	\N	\N
720	228	Erlanti Pandiangan	3277025205740017	087779605642	Perempuan	Kawin	Islam	Istri	1974-05-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.829391	\N	\N
721	228	Annisa Yoana Aulia	3277025806970020	\N	Perempuan	Belum Kawin	Islam	Anak	1997-06-18	PNS	Aktif	2026-03-08 17:47:15.83209	\N	\N
722	228	Nuraini Febrianti	3277025802020012	\N	Perempuan	Belum Kawin	Islam	Anak	2002-02-18	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.83491	\N	\N
723	228	Ahmes Muhamad Rizqi	3277020308040005	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-08-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.837705	\N	\N
724	229	Aris Widiyawan	3277021505960013	081572024199	Laki-laki	Kawin	Islam	Kepala Keluarga	1996-05-15	Karyawan BUMN	Aktif	2026-03-08 17:47:15.84041	\N	\N
725	229	Husaeni Anugrah Walikarna	3217024212950002	081572024199	Perempuan	Kawin	Islam	Istri	1995-12-02	Karyawan Swasta	Aktif	2026-03-08 17:47:15.843608	\N	\N
726	229	Zeannisa Daneen Widiyawan	3277024710220001	\N	Perempuan	Belum Kawin	Islam	Anak	2022-10-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.846711	\N	\N
727	229	Zhafir Dzakwan Widiyawan	3277020505240001	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-05-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.85227	\N	\N
728	230	Herawaty	3277027112790024	085720384764	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1979-12-31	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.857757	\N	\N
729	230	Mochammad Fadly Fadilah	3277022112020011	0885720384764	Laki-laki	Belum Kawin	Islam	Anak	2002-12-21	Karyawan Swasta	Aktif	2026-03-08 17:47:15.862947	\N	\N
730	230	Silvina Amalia Oktaviani	3277025220200003	\N	Perempuan	Belum Kawin	Islam	Anak	2010-10-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.867892	\N	\N
731	231	Aan Syaripudin	3277021507600001	088222565593	Laki-laki	Kawin	Islam	Kepala Keluarga	1960-07-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.870872	\N	\N
732	231	Yati	3277025805630001	088222565593	Perempuan	Kawin	Islam	Istri	1963-05-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.873998	\N	\N
733	231	Elis Nawati	3277024205020001	\N	Perempuan	Belum Kawin	Islam	Anak	2002-05-02	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.876818	\N	\N
734	231	Fitri Nurlaela	3277024203040001	088222565593	Perempuan	Belum Kawin	Islam	Anak	2004-03-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.879311	\N	\N
735	231	Muhammad Aji Nurjaman	3277020501090003	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-01-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.884845	\N	\N
736	232	Biqi Maulana	3204251211880004	081221929966	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-11-12	Karyawan Swasta	Aktif	2026-03-08 17:47:15.887775	\N	\N
737	232	Sri Hartini	3277036301910008	081221929966	Perempuan	Kawin	Islam	Istri	1991-01-23	Guru	Aktif	2026-03-08 17:47:15.890587	\N	\N
738	232	Kezio Emir Cavano	3277021406210002	\N	Laki-laki	Belum Kawin	Islam	Anak	2021-06-14	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.893143	\N	\N
739	232	Haruna Omera Falgumi	3277025007250010	\N	Perempuan	Belum Kawin	Islam	Anak	2025-07-10	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.896787	\N	\N
740	233	Sandi Rismawan	3277023005990021	089631820989	Laki-laki	Kawin	Islam	Kepala Keluarga	1999-05-30	Karyawan Swasta	Aktif	2026-03-08 17:47:15.903148	\N	\N
741	233	Nur Handayani	3277037008990010	089631820989	Perempuan	Kawin	Islam	Istri	1999-07-30	Karyawan Swasta	Aktif	2026-03-08 17:47:15.909748	\N	\N
742	233	Edgar Gian Rismawan	3277020908240004	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-08-09	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.913379	\N	\N
743	234	Fajar Ari Pratama	3277020205970009	082116973211	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-05-02	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.917716	\N	\N
744	234	Fani Destriani	3277026312980016	082116973211	Perempuan	Kawin	Islam	Istri	1998-12-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.921308	\N	\N
745	234	Muhammad Arkanza Pratama	3277021902250002	\N	Laki-laki	Belum Kawin	Islam	Anak	2025-02-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.924861	\N	\N
746	235	Asep Juhana	3277021805720023	0895415867711	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-05-18	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.927854	\N	\N
747	235	Elis Ela Hayati	3277025706730017	0895631923030	Perempuan	Kawin	Islam	Istri	1973-06-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.931383	\N	\N
748	235	Neng Hikmah Juhana	3277024705930010	\N	Perempuan	Belum Kawin	Islam	Anak	1993-05-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.934176	\N	\N
749	235	Muhamad Adam Mustofa Juhana	3277023107970014	\N	Laki-laki	Belum Kawin	Islam	Anak	1997-07-31	Wiraswasta	Aktif	2026-03-08 17:47:15.936385	\N	\N
750	235	Aira Hurul Aini Juhana	3277025911090002	\N	Perempuan	Belum Kawin	Islam	Anak	2009-11-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.939647	\N	\N
751	236	Asep Rahmat	3217032212820004	081395738648	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-12-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.942832	\N	\N
752	236	Mila Maliawati	3277025705830024	081295738648	Perempuan	Kawin	Islam	Istri	1983-05-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.94535	\N	\N
753	236	Rahmalia Kirana Shiddiq	3277024205130006	\N	Perempuan	Belum Kawin	Islam	Anak	2013-05-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.948142	\N	\N
754	236	Muhammad Azka Malik	3277020409170004	\N	Laki-laki	Belum Kawin	Islam	Anak	2017-09-04	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.952723	\N	\N
755	237	Asep Khoerudin	3277021805740001	089644630931	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-05-18	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.955019	\N	\N
756	237	Dian Mardiani	3277024509730006	089644630931	Perempuan	Belum Kawin	Islam	Istri	1973-09-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.958703	\N	\N
757	237	Aulia Nazwa Hanniyah	3277025107040003	\N	Perempuan	Belum Kawin	Islam	Anak	2004-07-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.961993	\N	\N
758	237	Muhamad Supiyan Tsauri	3277021107050004	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-07-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.964978	\N	\N
759	238	Ade Sujai	3277020807640005	085317803258	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-07-08	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.968019	\N	\N
760	238	Hani Mulyani	3211115704820007	085317803258	Perempuan	Belum Kawin	Islam	Istri	1982-04-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.971203	\N	\N
761	238	Deri Herdian	3211110206080001	\N	Laki-laki	Belum Kawin	Islam	Anak	2008-06-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.975562	\N	\N
762	238	A.Zahra	3277025103150003	\N	Perempuan	Belum Kawin	Islam	Anak	2015-03-11	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.97815	\N	\N
763	238	Asti Humaira Dewi	3277025707210001	\N	Perempuan	Belum Kawin	Islam	Anak	2021-07-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:15.98075	\N	\N
764	239	Darussalam	3217031012750003	085974960038	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-12-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:15.98322	\N	\N
766	239	Elvina	3273066410830002	085797006185	Perempuan	Kawin	Islam	Istri	1983-10-24	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.990742	\N	\N
768	240	Hasna Andita Ramadhani	3277020506160003	\N	Perempuan	Belum Kawin	Islam	Anak	2016-06-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:15.998	\N	\N
769	239	Aufa Nazwa Fatimah	3205026609140005	085797006185	Perempuan	Belum Kawin	Islam	Anak	2014-09-26	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.000344	\N	\N
770	239	Muhammad Hikam Al Yamani	3205022810170005	085797006185	Laki-laki	Belum Kawin	Islam	Anak	2017-10-28	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.002861	\N	\N
771	241	Uhay Suhaya	3277021908500006	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1950-08-19	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.005279	\N	\N
772	242	Asep Sutisna	3277020508790016	089661949234	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-08-05	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.008849	\N	\N
773	243	SITI HOLIYAH	3277024408710020	085945232684	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1969-08-04	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.012175	\N	\N
767	240	Rita Sari Somantire	3277025810710019	081221482968	Perempuan	Kawin	Islam	Istri	1971-10-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:15.994105	\N	Diploma IV/Strata I
774	242	Yuli Fitriani	3277024707870021	089661949234	Perempuan	Kawin	Islam	Istri	1987-07-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.015048	\N	\N
775	243	LEONITA YULIANA	3277026407980005	\N	Perempuan	Belum Kawin	Islam	Anak	1998-07-24	Karyawan Swasta	Aktif	2026-03-08 17:47:16.017512	\N	\N
776	242	Alfan Nugraha	3277020207100006	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-07-02	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.019859	\N	\N
777	242	Adriana Meyriska	3277026205160001	\N	Perempuan	Belum Kawin	Islam	Anak	2016-05-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.023795	\N	\N
778	244	Entin Sartika	3277034107610188	081221929966	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1961-07-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.027254	\N	\N
779	245	Usep Irawan	3277021808790033	081546533590	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-09-18	Lainnya	Aktif	2026-03-08 17:47:16.029845	\N	\N
780	245	Nina Kartini	3277025506850017	081546533590	Perempuan	Kawin	Islam	Istri	1985-06-15	Lainnya	Aktif	2026-03-08 17:47:16.032748	\N	\N
781	245	Khanza Arsyila Irawan	3277024108820000	\N	Perempuan	Belum Kawin	Islam	Anak	2020-08-01	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.035398	\N	\N
782	246	Rudi Mulyana	3277022011850010	08562188310	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-11-20	Karyawan Swasta	Aktif	2026-03-08 17:47:16.038455	\N	\N
783	246	Dwi Lestari	3277024208850005	08562188310	Perempuan	Kawin	Islam	Istri	1985-08-02	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.041179	\N	\N
784	246	Zindan Maulana Sakhi	3277022701110002	\N	Laki-laki	Belum Kawin	Islam	Anak	2011-01-27	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.04392	\N	\N
785	247	MIA YUNIAR	3277025206880016	089525309265	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1988-06-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.047586	\N	\N
786	247	YUDHA FADLAN RAMADAN	3277020310060008	\N	Laki-laki	Belum Kawin	Islam	Anak	2006-10-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.051037	\N	\N
787	247	YUGA DWI PUTRA ARYADI	3277022605090002	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-05-26	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.053588	\N	\N
788	248	Irvan Nurul Yakin	3277020811910006	081572700863	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-11-08	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.057233	\N	\N
789	248	Ayu Patimah	3206136811930002	085624211236	Perempuan	Kawin	Islam	Istri	1993-11-28	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.062055	\N	\N
790	246	Zulfayza Hanifa Kahfiana	3277025205180004	\N	Perempuan	Belum Kawin	Islam	Anak	2018-05-12	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.065296	\N	\N
791	249	LUKMAN KOLIM	3674062010850011	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-10-20	TNI	Aktif	2026-03-08 17:47:16.06832	\N	\N
792	248	Kaysan Abinaya Yakin	3277022910180003	085624211236	Laki-laki	Belum Kawin	Islam	Anak	2018-10-29	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.07085	\N	\N
793	246	Zeinara Hamada Al Ghanisha	3277026505210004	\N	Perempuan	Belum Kawin	Islam	Anak	2021-05-25	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.073539	\N	\N
794	249	NINDA TRIA PERMATASARI	3273064509920002	087890005066	Perempuan	Kawin	Islam	Istri	1992-09-05	Pengacara	Aktif	2026-03-08 17:47:16.076146	\N	\N
795	249	RYSHAD PUSHIKA AL AFZAM	3277020703190002	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-03-07	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.079159	\N	\N
796	251	DJOKO SUYONO	3273060706540002	083840683300	Laki-laki	Kawin	Islam	Kepala Keluarga	1954-05-07	Pensiunan	Aktif	2026-03-08 17:47:16.082269	\N	\N
797	250	Muhidin Andriansyah	3277021307670006	0895393928824	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1967-07-13	Pedagang	Aktif	2026-03-08 17:47:16.084955	\N	\N
798	251	EUIS MAYASARI	3273066603610001	087890005066	Perempuan	Kawin	Islam	Istri	1961-03-26	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.087749	\N	\N
799	250	Idris Maulana Andriansyah	3277022407980017	0895393928824	Laki-laki	Belum Kawin	Islam	Anak	1998-07-24	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.090246	\N	\N
800	253	Dindin Nurdiana	3277021701770001	081220133071	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-01-17	Karyawan Swasta	Aktif	2026-03-08 17:47:16.093682	\N	\N
801	252	PRIATNA	3217040810700007	082151013257	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-10-08	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.097374	\N	\N
802	253	Iik Mudrikah	3277025802770003	081220133071	Perempuan	Kawin	Islam	Istri	1977-02-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.103648	\N	\N
803	252	YATI SURYATI	3277025406840004	\N	Perempuan	Kawin	Islam	Istri	1984-06-14	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.107719	\N	\N
804	253	Sylva Melia Arviani	3277026405050006	\N	Perempuan	Belum Kawin	Islam	Anak	2005-05-24	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.112634	\N	\N
805	252	MUHAMAD YUSUP SURYANA	3277022401060004	\N	Laki-laki	Belum Kawin	Islam	Anak	2006-01-24	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.116601	\N	\N
806	252	INDIRA NUR AULIA	3277024509240001	\N	Perempuan	Belum Kawin	Islam	Anak	2024-09-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.11935	\N	\N
807	216	Jaenal Abidin	3217102908890003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-08-29	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.124171	\N	\N
808	216	Sri Mulantini	3277026906900014	\N	Perempuan	Kawin	Islam	Istri	1990-06-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.126964	\N	\N
809	216	Akifa Naila Husna	3277026908140004	\N	Perempuan	Belum Kawin	Islam	Anak	2014-08-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.129806	\N	\N
810	216	Chayra Misha Ramadhani	3277026905190002	\N	Perempuan	Belum Kawin	Islam	Anak	2019-05-29	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.132654	\N	\N
811	254	Usman	3217061405940003	083124425107	Laki-laki	Kawin	Islam	Kepala Keluarga	1994-05-14	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.137547	\N	\N
812	256	Trini Diana Wati	3277024702550005	082325918928	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1955-02-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.14913	\N	\N
813	255	APRILITA HERAWATI MATATULA	3277035804750017	08986411672	Perempuan	Kawin	Islam	Kepala Keluarga	1975-04-18	Wiraswasta	Aktif	2026-03-08 17:47:16.152321	\N	\N
814	255	CANTIKAN MAUDY HERMAWAN	3277035906000006	\N	Perempuan	Belum Kawin	Islam	Anak	2000-06-19	Karyawan Swasta	Aktif	2026-03-08 17:47:16.155774	\N	\N
815	255	ARLYA SEKAR KUSUMO	3277036006020015	\N	Perempuan	Belum Kawin	Islam	Anak	2002-06-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.158788	\N	\N
816	256	Frilanda Noora Permana	3277020604790002	\N	Laki-laki	Belum Kawin	Islam	Anak	1979-04-06	Wiraswasta	Aktif	2026-03-08 17:47:16.161892	\N	\N
817	254	Dian Darwaty	3277026804880001	087729288149	Perempuan	Kawin	Islam	Istri	1988-05-28	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.167347	\N	\N
818	256	Agie Nasa Pertala	3277021208860001	\N	Laki-laki	Belum Kawin	Islam	Anak	1986-08-12	Karyawan Swasta	Aktif	2026-03-08 17:47:16.171931	\N	\N
819	254	Muhammad Fiqri Adrian	3277021908120002	\N	Laki-laki	Belum Kawin	Islam	Anak	2012-08-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.175105	\N	\N
820	257	Herman Tri Heryanto	3277020403800018	08172343277	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-03-04	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.177642	\N	\N
821	257	Elly Sunarti	3277025505800045	08172343277	Perempuan	Kawin	Islam	Istri	1980-05-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.179667	\N	\N
822	257	Hasna Aghnia Nabilah	3277025702070002	\N	Perempuan	Belum Kawin	Islam	Anak	2007-02-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.182267	\N	\N
823	258	DEDE SULYANTO	3275030812590019	081384802450	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-12-06	Karyawan Swasta	Aktif	2026-03-08 17:47:16.18438	\N	\N
824	258	ASIH TRI RIANTI	3275034311740009	\N	Perempuan	Kawin	Islam	Istri	1974-11-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.18663	\N	\N
825	254	Aprilia Putri Adriani	3277026704180004	\N	Perempuan	Belum Kawin	Islam	Anak	2018-04-27	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.188667	\N	\N
826	257	Faqih Khairy Rahman	3277022101140004	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-01-21	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.190737	\N	\N
827	258	LALA YUNIDA	3275036503980025	0895373849600	Perempuan	Belum Kawin	Islam	Anak	1998-03-25	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.193051	\N	\N
828	257	Haytham Irsyad Nashshar	3277022211190002	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-11-22	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.195648	\N	\N
829	258	WELI BUDYANTO	3275030905010013	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-06-09	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.197718	\N	\N
830	259	Dadan Sulaeman	3277020103600001	087719664618	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1969-03-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.199857	\N	\N
831	260	Yudi Iswanto	3277010102680003	087785023848	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-02-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.202031	\N	\N
832	260	Cicah Cahyanti	3277015307750028	087785023848	Perempuan	Kawin	Islam	Istri	1975-07-13	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.205815	\N	\N
833	261	Baban	3211171401730001	0895631930308	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-01-14	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.20816	\N	\N
834	260	Nurul Hasanah	3277015406960013	083111614143	Perempuan	Belum Kawin	Islam	Anak	1996-06-14	Karyawan Swasta	Aktif	2026-03-08 17:47:16.210867	\N	\N
835	261	Dewi Agustina	3277025708790044	089654043647	Perempuan	Kawin	Islam	Istri	1979-08-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.21298	\N	\N
836	261	Rendi Juniawan	3211171706090001	081916412247	Laki-laki	Belum Kawin	Islam	Anak	2009-06-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.215105	\N	\N
837	262	Dede Carmana	3277021501760009	089521576962	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-01-15	Pedagang	Aktif	2026-03-08 17:47:16.217149	\N	\N
838	261	Reza Nurdiansah	3277021909110004	0895404017030	Laki-laki	Belum Kawin	Islam	Anak	2011-09-19	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.219773	\N	\N
839	262	Hurina Buntuan	3277025911750017	089521576962	Perempuan	Kawin	Islam	Istri	1975-11-19	Karyawan Swasta	Aktif	2026-03-08 17:47:16.221945	\N	\N
840	262	Hermanto Nana Januari Pratama	3277021401030001	\N	Laki-laki	Belum Kawin	Islam	Anak	2003-01-14	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.224738	\N	\N
841	262	Tiara Syilawati	3277026009060003	\N	Perempuan	Belum Kawin	Islam	Anak	2006-09-20	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.22702	\N	\N
842	263	Apriadi Muriana	3277022404780002	081220390678	Laki-laki	Kawin	Islam	Kepala Keluarga	1978-04-24	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.23129	\N	\N
843	263	Alis Maria Gustini	3217084908800006	081220390678	Perempuan	Kawin	Islam	Istri	1980-08-09	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.237542	\N	\N
844	264	Hery Gunawan	3277022603780016	081214552114	Laki-laki	Kawin	Islam	Kepala Keluarga	1978-03-26	Wiraswasta	Aktif	2026-03-08 17:47:16.24059	\N	\N
845	264	Rima Susanti	3277025901740015	081214552114	Perempuan	Kawin	Islam	Istri	1974-01-19	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.242791	\N	\N
846	264	Citra Fauzia	3277027101100001	\N	Perempuan	Belum Kawin	Islam	Anak	2010-01-31	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.245967	\N	\N
847	265	Toha	3277022404630001	087825432639	Laki-laki	Kawin	Islam	Kepala Keluarga	1963-04-24	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.248169	\N	\N
848	264	Vino Al Ghifary Ramadhan	3277022307130001	\N	Laki-laki	Belum Kawin	Islam	Anak	2013-07-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.250424	\N	\N
849	265	Atih Mulyani	3277024505650038	087825432639	Perempuan	Kawin	Islam	Istri	1965-05-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.253516	\N	\N
850	265	Imas Masitoh	3277026112970017	089613473872	Perempuan	Belum Kawin	Islam	Anak	1997-12-21	Karyawan Swasta	Aktif	2026-03-08 17:47:16.256026	\N	\N
851	266	Roni Hardiansyah	3273051505910003	082240025557	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-05-15	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.259204	\N	\N
852	266	Tina Octaviani	3277025210960001	082219855909	Perempuan	Kawin	Islam	Istri	1996-10-12	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.26169	\N	\N
853	266	Clemira Putri Hardiansyah	3277026011190002	082219855909	Perempuan	Belum Kawin	Islam	Anak	2019-11-20	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.264098	\N	\N
854	267	Aisyah	3277025411640006	0895633265090	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1964-11-14	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.266594	\N	\N
855	267	Andi Sopandi	3277020508960005	089656008490	Laki-laki	Belum Kawin	Islam	Anak	1996-08-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.269057	\N	\N
856	268	Inri Febriyanti	3277025302040004	081221253786	Perempuan	Kawin	Islam	Kepala Keluarga	2004-02-13	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.271406	\N	\N
857	268	Adiba Fadilah Fauziah	3277025907210002	081221253786	Perempuan	Belum Kawin	Islam	Anak	2021-07-19	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.273442	\N	\N
858	269	Dede Rosadi	3277022207740001	08310057125	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-07-22	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.276494	\N	\N
859	269	Mas Fitriah	3277025510770023	08999291729	Perempuan	Kawin	Islam	Istri	1977-10-15	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.278562	\N	\N
860	269	Irfansyah Jamaludin	3277021708070005	089612916744	Laki-laki	Belum Kawin	Islam	Anak	2007-08-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.28129	\N	\N
861	270	Deni Sudaryadi	3217063112960005	089652486734	Laki-laki	Kawin	Islam	Kepala Keluarga	1996-12-31	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.285177	\N	\N
862	270	Rismawati	3277024112950007	089693244012	Perempuan	Kawin	Islam	Istri	1995-12-01	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.289434	\N	\N
863	271	Suhendar	3277020710760001	089524537380	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-10-07	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.292972	\N	\N
864	271	Dedeh	3277026503800002	089524537380	Perempuan	Kawin	Islam	Istri	1980-03-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.296993	\N	\N
865	271	Hari Subagja	3277021410000025	089678588135	Laki-laki	Belum Kawin	Islam	Anak	2000-10-14	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.300266	\N	\N
866	271	Nengsih Siti Rosidah	3277025509040008	089514167969	Perempuan	Belum Kawin	Islam	Anak	2004-09-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.30309	\N	\N
867	271	Ayu Sarifah	3277025809120002	089637659247	Perempuan	Belum Kawin	Islam	Anak	2012-09-18	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.305292	\N	\N
868	272	YANA RODIANA	3204350111800006	082263009321	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-11-01	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.307872	\N	\N
869	272	IIS AISYAH	3204354709790007	\N	Perempuan	Kawin	Islam	Istri	1979-09-07	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.309922	\N	\N
870	272	FAIZ FAUDZAN	3204351212050006	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-12-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.312881	\N	\N
871	273	Nicolas Supriyadi	3277020612700015	081223815790	Laki-laki	Cerai Hidup	Katolik	Kepala Keluarga	1970-12-06	Karyawan Swasta	Aktif	2026-03-08 17:47:16.316393	\N	\N
872	272	DIMAS SAPUTRA	3204352909090003	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-09-29	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.319069	\N	\N
873	272	CINTA AULIA	3204355005110001	\N	Perempuan	Belum Kawin	Islam	Anak	2011-10-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.321681	\N	\N
874	272	SENDY MIAZ	3204351005110003	\N	Laki-laki	Belum Kawin	Islam	Anak	2011-10-05	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.324419	\N	\N
875	274	Yeyen Liesyeni	3277025111720020	081223815790	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1972-11-11	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.327117	\N	\N
876	274	Liesandrio Nicho Mahendra	3277021607990001	081223815790	Laki-laki	Belum Kawin	Islam	Anak	1999-07-15	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.32999	\N	\N
877	274	Cucu	3277025708560012	089639601267	Perempuan	Cerai Mati	Islam	Orang Tua	1956-08-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.3328	\N	\N
878	275	INDRA AHMAD FAUZI	3217061805960010	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1996-05-18	Karyawan Swasta	Aktif	2026-03-08 17:47:16.33654	\N	\N
879	275	NITA MARIANA	3277024906970008	0895345617612	Perempuan	Kawin	Islam	Istri	1997-06-09	Guru	Aktif	2026-03-08 17:47:16.339228	\N	\N
880	276	Bella Rizky Ananda	3277025704990018	081223815790	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1999-04-17	Karyawan Swasta	Aktif	2026-03-08 17:47:16.34356	\N	\N
881	275	HAIFA FIEQUISA SAFWANA FAUZI	3277024508220001	\N	Perempuan	Belum Kawin	Islam	Anak	2022-08-05	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.348598	\N	\N
882	276	Antonius Jasper Malachy	3171041711210001	081223815790	Laki-laki	Belum Kawin	Islam	Anak	2021-11-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.352051	\N	\N
883	277	Heni Lussyiani	3277026503830002	081223815790	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1983-03-25	Karyawan Swasta	Aktif	2026-03-08 17:47:16.355239	\N	\N
884	277	Salsabila Lucia Azmy	3277026305080006	\N	Perempuan	Belum Kawin	Islam	Anak	2008-05-23	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.358166	\N	\N
885	277	Mackenzie Muhammad Khalief	3277022209220006	\N	Laki-laki	Belum Kawin	Islam	Anak	2022-09-22	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.361136	\N	\N
886	279	DARYANTO	3277021011750001	085159433102	Laki-laki	Kawin	Islam	Kepala Keluarga	1974-11-10	Buruh Harian Lepas	Aktif	2026-03-08 17:47:16.364011	\N	\N
887	279	PARSI	3277025605780002	\N	Perempuan	Kawin	Islam	Istri	1978-05-16	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.369841	\N	\N
888	279	ANDIKA NUR HUDA	3277020908040005	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-08-09	Karyawan Swasta	Aktif	2026-03-08 17:47:16.373394	\N	\N
889	279	BAIHAKI AL NAZIR	3277020602100001	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-02-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.376882	\N	\N
890	280	Asep Nugraha	3277021507770027	081220802698	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-07-15	POLRI	Aktif	2026-03-08 17:47:16.390661	\N	\N
891	280	Lia Amalia Septiana	3277024309760025	08122802698	Perempuan	Kawin	Islam	Istri	1976-09-03	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.395078	\N	\N
892	280	Rafi Akmal Juliansyah	3277021007050005	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-07-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.39764	\N	\N
893	280	Siti Nazwa Agnia Nugraha	3277024601080001	\N	Perempuan	Belum Kawin	Islam	Anak	2008-01-06	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.40059	\N	\N
894	280	Muhamad Rizki Aditya Juliansyah	3277020107110004	\N	Laki-laki	Belum Kawin	Islam	Anak	2011-07-01	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.402924	\N	\N
895	47	Maria Elisabeth Pattipeiluhu	3273105012670004	087829649830	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1967-12-10	Pensiunan	Aktif	2026-03-08 17:47:16.408343	\N	\N
896	282	Cintia	3206326310840001	085860492316	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1984-10-23	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.412559	\N	\N
897	282	Muhammad Rasya Syaputra	3206320801150002	\N	Laki-laki	Belum Kawin	Islam	Anak	2015-01-08	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.415691	\N	\N
898	282	Rifqi Pauzi Ramadhansyah	3206320210070002	\N	Laki-laki	Belum Kawin	Islam	Anak	2007-10-02	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.418265	\N	\N
899	282	Muhammad Rafiq Dhuha Malik	3277021710180008	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-10-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.420921	\N	\N
900	282	Kejora Nur Haliza	3277027003230004	\N	Perempuan	Belum Kawin	Islam	Anak	2023-03-30	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.423281	\N	\N
901	283	Ida Hamidah	3277024902640005	082122930662	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1964-02-09	Pensiunan	Aktif	2026-03-08 17:47:16.42759	\N	\N
902	283	Ihsan Aulia Hanif	3277020305970010	082298968318	Laki-laki	Belum Kawin	Islam	Anak	1997-05-03	Wiraswasta	Aktif	2026-03-08 17:47:16.43006	\N	\N
903	283	Yaasmiin Nuur Haniifah	3277025308020014	082122930662	Perempuan	Belum Kawin	Islam	Anak	2002-08-13	Karyawan Swasta	Aktif	2026-03-08 17:47:16.432838	\N	\N
904	284	Dadang Efendi	3277022912570003	082132557117	Laki-laki	Kawin	Islam	Kepala Keluarga	1957-12-29	Wiraswasta	Aktif	2026-03-08 17:47:16.435621	\N	\N
905	284	Ai Nayati	3277025804700006	082132557117	Perempuan	Kawin	Islam	Istri	1970-04-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.438452	\N	\N
906	285	Hendro	3277021702870010	081320755362	Laki-laki	Kawin	Islam	Kepala Keluarga	1987-02-17	Wiraswasta	Aktif	2026-03-08 17:47:16.441221	\N	\N
907	285	Tia Putri Mardatila	3172034506951005	\N	Perempuan	Kawin	Islam	Istri	1995-06-05	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.444056	\N	\N
908	285	Ainayya Asilah Humairah	3277024310150001	\N	Perempuan	Belum Kawin	Islam	Anak	2015-10-03	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.446753	\N	\N
909	285	Nabila Khanza Zahira	3277025005190006	\N	Perempuan	Belum Kawin	Islam	Anak	2019-05-10	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.449869	\N	\N
910	285	M Sulthan Arshaq Al Khalifi	3277020303210004	\N	Laki-laki	Belum Kawin	Islam	Anak	2021-03-03	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.453021	\N	\N
911	285	Muhammad Saddam Miqdad	3277021204230002	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-04-12	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.455977	\N	\N
912	286	Susilo	3277022407560012	08122356770	Laki-laki	Kawin	Kristen	Kepala Keluarga	1956-07-29	Pensiunan	Aktif	2026-03-08 17:47:16.458724	\N	\N
913	286	Tuti Kurniati	3277026509610002	3277026509610002	Perempuan	Kawin	Kristen	Istri	1961-09-25	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.464901	\N	\N
914	287	Deden Misbah	3277021210840016	085794455056	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-10-12	Wiraswasta	Aktif	2026-03-08 17:47:16.467516	\N	\N
915	287	Vera Rika Herlianto	3277014801980016	081221683009	Perempuan	Kawin	Islam	Istri	1998-01-18	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.470424	\N	\N
916	287	Denish Hafizh Alfarezi	3277022512180002	081221683009	Laki-laki	Belum Kawin	Islam	Anak	2018-12-25	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.473684	\N	\N
917	288	Sony Lastianto Wibowo	3277022402820016	08122356770	Laki-laki	Kawin	Kristen	Kepala Keluarga	1982-02-24	Lainnya	Aktif	2026-03-08 17:47:16.478272	\N	\N
918	288	Arisandi Susilowati	3277025601830016	08122356770	Perempuan	Kawin	Kristen	Istri	1983-01-16	Karyawan Swasta	Aktif	2026-03-08 17:47:16.482512	\N	\N
919	288	Mattew Chelo Adi Wibowo	3277021011100002	\N	Laki-laki	Belum Kawin	Kristen	Anak	2010-11-10	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:16.486351	\N	\N
920	288	Gevariel Nathan Adi Wibowo	3277022407200003	\N	Laki-laki	Belum Kawin	Kristen	Anak	2020-07-24	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.489218	\N	\N
921	289	Agung Ardhiansyah	3277031605940012	081517819809	Laki-laki	Kawin	Islam	Kepala Keluarga	1994-05-16	Wiraswasta	Aktif	2026-03-08 17:47:16.491904	\N	\N
922	289	Yuni Saftrianti	3273155107950002	081517819809	Perempuan	Kawin	Islam	Istri	1995-07-11	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.494862	\N	\N
923	289	Shaila Putri Ardhiansyah	3273115703210001	\N	Perempuan	Belum Kawin	Islam	Anak	2021-03-17	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.49847	\N	\N
924	168	Budianto	3277022202600004	081222769898	Laki-laki	Kawin	Islam	Kepala Keluarga	1960-02-22	Belum/Tidak Bekerja	Aktif	2026-03-08 17:47:16.503583	\N	\N
925	168	Lely Nurlely	3277026907600006	081222769898	Perempuan	Kawin	Islam	Istri	1976-07-29	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.506673	\N	\N
926	290	Rohani Rosmini	3277024601710008	085150654366	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1971-01-06	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:16.509143	\N	\N
1	1	Buce Akhmad Syafaat	3277021205710023	085220412373	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-05-12	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-08 17:47:13.25925	/uploads/ktp/1773000559396-4p3ounzej8.png	\N
242	73	Andini Dewi Pratiwi	3277025703730012	082116415299	Perempuan	Kawin	Islam	Kepala Keluarga	1973-03-17	Ibu Rumah Tangga	Aktif	2026-03-08 17:47:14.229101	/uploads/ktp/1773008796767-lqbxxre3dtp.jpg	\N
961	325	Sumarsih Sri  Nalendro	3277024505470006	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1974-05-05	Ibu Rumah Tangga	Aktif	2026-03-09 00:59:38.989688	\N	\N
962	326	Nani Karyani	3277026805630001	08999737947	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1963-05-28	Ibu Rumah Tangga	Aktif	2026-03-09 04:48:10.512869	\N	\N
963	326	Eni Nurminah	3277025007020023	0895351546495	Perempuan	Belum Kawin	Islam	Anak	2002-07-04	Belum/Tidak Bekerja	Aktif	2026-03-09 04:49:55.212216	\N	\N
964	327	Taufik Hidayat	3277022302820009	085217811119	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-02-23	Buruh Harian Lepas	Aktif	2026-03-09 05:57:49.416592	\N	\N
965	327	Kus Suryati Ningrum	3277025710790027	085222112254	Perempuan	Kawin	Islam	Istri	1979-10-17	Mengurus Rumah Tangga	Aktif	2026-03-09 06:00:08.164936	\N	\N
966	327	Keyla Hafiza Nur Hidayanti	3277024302100001	\N	Perempuan	Belum Kawin	Islam	Anak	2010-02-03	Pelajar/Mahasiswa	Aktif	2026-03-09 06:01:33.247463	\N	\N
967	327	Arsyla Nazmi Nur Azizah	3277026509170001	\N	Perempuan	Belum Kawin	Islam	Anak	2017-09-25	Belum/Tidak Bekerja	Aktif	2026-03-09 06:04:13.132351	\N	\N
165	47	Melinda Khaidir	3273104105020006	\N	Perempuan	Kawin	Islam	Anak	2002-05-01	Karyawan Swasta	Pindah	2026-03-08 17:47:13.881875	\N	\N
437	132	Acih	3277024507420010	088971211715	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1942-07-05	Belum/Tidak Bekerja	Pindah	2026-03-08 17:47:14.88022	\N	\N
968	328	YUNALDI BUR	3277021107750022	081322353222	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-07-11	Wiraswasta	Aktif	2026-03-09 07:14:16.725999	\N	\N
969	328	MARLYANI SUCI HATI PUTRI	3277025803810001	081322353222	Perempuan	Kawin	Islam	Istri	1981-03-18	Mengurus Rumah Tangga	Aktif	2026-03-09 07:15:38.900214	\N	\N
970	328	SAUSAN FATHIYAH	3277026102070003	081322353222	Perempuan	Belum Kawin	Islam	Anak	2007-02-21	Pelajar/Mahasiswa	Aktif	2026-03-09 07:17:42.453865	\N	\N
971	328	MUMTAZAH FATHINAH	3277026402080002	081322353222	Perempuan	Belum Kawin	Islam	Anak	2008-02-24	Pelajar/Mahasiswa	Aktif	2026-03-09 07:19:42.250208	\N	\N
972	328	NAWWAF FATHY RAMADHAN	3277020907130003	081322353222	Laki-laki	Belum Kawin	Islam	Anak	2013-07-09	Pelajar/Mahasiswa	Aktif	2026-03-09 07:21:06.61691	\N	\N
973	328	KANISA ZHARFA FATHANIAH	3277025201160003	081322353222	Perempuan	Belum Kawin	Islam	Anak	2016-01-12	Pelajar/Mahasiswa	Aktif	2026-03-09 07:22:51.18799	\N	\N
974	328	MUHAMMAD FATEH AYDAN	3277022809240006	081322353222	Laki-laki	Belum Kawin	Islam	Anak	2024-09-28	Belum/Tidak Bekerja	Aktif	2026-03-09 07:24:40.083152	\N	\N
975	330	BRAMULIA TORANG NAEK HASUDUNGAN	3277020405890010	082112851255	Laki-laki	Kawin	Kristen	Kepala Keluarga	1989-05-04	Karyawan Swasta	Aktif	2026-03-09 07:31:53.91645	\N	\N
976	331	Deni Hendra	3277021411760005	089655062525	Laki-laki	Belum Kawin	Islam	Anak	1976-11-14	\N	Aktif	2026-03-09 07:39:22.093542	\N	\N
977	331	Dhina Indira Lilhawa	3277026202800028	089655062525	Perempuan	Kawin	Islam	Istri	1980-02-22	Guru	Aktif	2026-03-09 07:41:02.526853	\N	\N
978	331	Zahra Muthia Salsabila	3277026107020014	\N	Perempuan	Belum Kawin	Islam	Anak	2002-07-21	Pelajar/Mahasiswa	Aktif	2026-03-09 07:43:53.412605	\N	\N
979	331	Ahza Hafizh Rahmeka	3277021504050003	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-04-15	Pelajar/Mahasiswa	Aktif	2026-03-09 07:47:52.200097	\N	\N
980	330	ESRAWATI NOVALIANA	3204105011910008	082118251255	Perempuan	Kawin	Islam	Istri	1997-11-10	Karyawan Swasta	Aktif	2026-03-09 07:48:02.980899	\N	\N
981	330	Nathanael Mangiring Bramesa	3277022609200001	082118251255	Laki-laki	Belum Kawin	Kristen	Anak	2020-09-26	Belum/Tidak Bekerja	Aktif	2026-03-09 07:50:49.270602	\N	\N
982	331	Raisha Azalea Mikaila 	3277024806100004	\N	Perempuan	Belum Kawin	Islam	Anak	2010-08-03	Pelajar/Mahasiswa	Aktif	2026-03-09 07:51:14.033123	\N	\N
983	331	Arshan Muhammad Ibrahim	3277021609160004	\N	Laki-laki	Belum Kawin	Islam	Anak	2016-09-16	Pelajar/Mahasiswa	Aktif	2026-03-09 07:52:32.395036	\N	\N
984	331	Arham Zavian Ardavan	3277021406190003	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-06-14	Pelajar/Mahasiswa	Aktif	2026-03-09 07:53:43.682437	\N	\N
1255	411	FAIZ ALFATH MUSHAFFA	3277020705200004	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-07-09	Pelajar/Mahasiswa	Aktif	2026-03-12 08:18:51.758772	\N	Tidak/Belum Tamat SD
986	281	MELVA F.HASIBUAN	3277024802870006	082118251255	Perempuan	Belum Kawin	Kristen	Anak	1987-02-08	Karyawan Swasta	Aktif	2026-03-09 07:58:11.436031	\N	\N
987	281	FRANKLIN B.T HASIBUAN	3277022401920019	082118251255	Laki-laki	Belum Kawin	Islam	Anak	1992-01-24	Belum/Tidak Bekerja	Aktif	2026-03-09 07:59:28.242761	\N	\N
988	334	Bruri Pramono	3277020202800001	081329612550	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-02-02	Karyawan Swasta	Aktif	2026-03-09 08:00:58.378675	\N	\N
989	329	Kiki Mulyakin	3277022907680013	085220653983	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-07-29	Wiraswasta	Aktif	2026-03-09 08:02:34.369085	\N	\N
990	334	Suryani Pratiwi	3277025705800023	\N	Perempuan	Kawin	Islam	Istri	1980-05-17	Mengurus Rumah Tangga	Aktif	2026-03-09 08:03:32.965759	\N	\N
991	329	Trianti Nugraheni	3277025603730010	\N	Perempuan	Kawin	Islam	Istri	1973-03-16	Dosen	Aktif	2026-03-09 08:03:57.968921	\N	\N
992	334	Cheisya Mutiara Cahyaningtyas	3277025305080001	\N	Perempuan	Belum Kawin	Islam	Anak	2008-05-13	Pelajar/Mahasiswa	Aktif	2026-03-09 08:05:01.494619	\N	\N
993	329	Mubdi Mulya Isfahami	3277021007960001	\N	Laki-laki	Belum Kawin	Islam	Anak	1996-07-01	Belum/Tidak Bekerja	Aktif	2026-03-09 08:05:05.282403	\N	\N
994	329	Mugni Mulya Isfahaldi	3277021809020016	\N	Laki-laki	Belum Kawin	Islam	Anak	2002-09-18	Pelajar/Mahasiswa	Aktif	2026-03-09 08:06:23.578833	\N	\N
927	291	Iwan	3277020911750015	\N	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1975-11-09	Tukang Kayu	Aktif	2026-03-08 17:47:16.513149	\N	\N
11	5	Ekariyanti Mulawarman	3277024906960010	085860604142	Perempuan	Kawin	Islam	Istri	1996-06-09	Mengurus Rumah Tangga	Aktif	2026-03-08 17:47:13.29309	/uploads/ktp/1773014269613-o7s12m01hl.jpeg	SLTA/Sederajat
995	334	Anindya Jasmine Rachmadhiyani	3277026107140003	\N	Perempuan	Belum Kawin	Islam	Anak	2014-07-21	Pelajar/Mahasiswa	Aktif	2026-03-09 08:06:37.298524	\N	\N
996	332	Yulianto Nugraha	3273200207840001	081321848982	Laki-laki	Kawin	Kristen	Kepala Keluarga	1984-07-02	Karyawan Swasta	Aktif	2026-03-09 08:08:38.252601	\N	\N
997	334	Arsyfa Salsabilla Putri	3277026007160001	\N	Perempuan	Belum Kawin	Islam	Anak	2016-07-20	Pelajar/Mahasiswa	Aktif	2026-03-09 08:10:06.963502	\N	\N
998	332	Reni Novienna 	6271034911910005	\N	Perempuan	Kawin	Katolik	Istri	1991-11-08	Karyawan Swasta	Aktif	2026-03-09 08:10:29.610716	\N	\N
999	332	Felicia Ivana Tovie	3273206812150001	\N	Perempuan	Belum Kawin	Kristen	Anak	2015-12-28	Pelajar/Mahasiswa	Aktif	2026-03-09 08:11:54.010985	\N	\N
1000	332	Harvey Raphael Tovie	32770208072000003	\N	Laki-laki	Belum Kawin	Kristen	Anak	2020-07-08	Pelajar/Mahasiswa	Aktif	2026-03-09 08:12:58.387811	\N	\N
1001	335	Dana Supriatna Kartaatmaja	3277022211550003	082117596900	Laki-laki	Kawin	Islam	Kepala Keluarga	1955-11-22	Pensiunan	Aktif	2026-03-09 08:15:46.347581	\N	\N
1002	336	Handiyanto	3277020107730001	08112289087	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-07-14	Karyawan Swasta	Aktif	2026-03-09 08:17:01.809479	\N	\N
1003	335	Anna Suhana Said	3277025508550014	\N	Perempuan	Kawin	Islam	Istri	1955-08-15	Mengurus Rumah Tangga	Aktif	2026-03-09 08:17:41.260606	\N	\N
1004	337	MUHAMMAD SADDAM HUSSEIN	3217082710910003	085721422455	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-10-27	Karyawan BUMN	Aktif	2026-03-09 08:18:12.304095	\N	\N
1005	336	Andriany	3277025203710022	08122359616	Perempuan	Kawin	Islam	Istri	1971-03-12	Mengurus Rumah Tangga	Aktif	2026-03-09 08:18:36.770198	\N	\N
1006	336	Vania Levianna Putri	3277026207030002	\N	Perempuan	Belum Kawin	Islam	Anak	2003-07-22	Pelajar/Mahasiswa	Aktif	2026-03-09 08:19:38.959424	\N	\N
1007	337	ADHIKA TANIA HARTANTO	3277025706920001	085220226062	Laki-laki	Kawin	Islam	Istri	1992-06-17	Mengurus Rumah Tangga	Aktif	2026-03-09 08:19:39.428369	\N	\N
1008	336	Alvin Ferdinand Winata	3277021005140002	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-05-10	Pelajar/Mahasiswa	Aktif	2026-03-09 08:20:39.296663	\N	\N
1009	337	ALITA SHIDQIA HUSSEIN	3277024309200001	085220226062	Perempuan	Belum Kawin	Islam	Anak	2020-09-03	Pelajar/Mahasiswa	Aktif	2026-03-09 08:20:58.138626	\N	\N
1010	338	Dicky Agus Priyana	3277020708810032	08126666133	Laki-laki	Kawin	Islam	Kepala Keluarga	1981-08-07	Wiraswasta	Aktif	2026-03-09 08:22:48.597686	\N	\N
1011	339	EKO HARTANTO	3277021807600004	085321100530	Laki-laki	Kawin	Islam	Kepala Keluarga	1960-07-18	Belum/Tidak Bekerja	Aktif	2026-03-09 08:23:35.735877	\N	\N
1012	338	Rani Koncarawati	3204405704820002	082218988982	Perempuan	Kawin	Islam	Istri	1982-04-17	Mengurus Rumah Tangga	Aktif	2026-03-09 08:24:25.003356	\N	\N
1013	339	MILA GANESIA WATTY M	3277025511630007	085220818119	Perempuan	Kawin	Islam	Istri	1963-11-15	Mengurus Rumah Tangga	Aktif	2026-03-09 08:25:22.614872	\N	\N
1014	338	Kirana Anandya Putri Setiawan	3204404501040001	085156401963	Perempuan	Kawin	Islam	Anak	2004-01-05	Mengurus Rumah Tangga	Aktif	2026-03-09 08:26:20.798475	\N	\N
985	281	TUMPAL B. HASIBUAN	327702064530001	081322579034	Laki-laki	Cerai Mati	Kristen	Kepala Keluarga	1953-04-06	Belum/Tidak Bekerja	Aktif	2026-03-09 07:55:45.628193	\N	\N
1015	338	Nayyara Gisselda Putri Setiawan	3204404305080002	082218988980	Perempuan	Belum Kawin	Islam	Anak	2008-05-03	Pelajar/Mahasiswa	Aktif	2026-03-09 08:28:10.902493	\N	\N
1016	343	Budi Siswoyo	3277021004640012	082112544354	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-04-10	Belum/Tidak Bekerja	Aktif	2026-03-09 08:28:56.269909	\N	\N
1017	338	Danendra Malik Alfarizki	3277020502180003	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-02-05	Pelajar/Mahasiswa	Aktif	2026-03-09 08:30:11.733969	\N	\N
1019	343	Ike Fazriati	3277024601640006	087822622354	Perempuan	Kawin	Islam	Istri	1964-01-06	Ibu Rumah Tangga	Aktif	2026-03-09 08:30:21.197137	\N	\N
1020	338	Dipta Magika Arashi	3277021401200003	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-01-14	Pelajar/Mahasiswa	Aktif	2026-03-09 08:31:11.918905	\N	\N
1022	341	Muhammad Rifqi Zulfa	3277021210970016	0895365054545	Laki-laki	Kawin	Islam	Kepala Keluarga	1997-10-12	Karyawan Swasta	Aktif	2026-03-09 08:32:03.941783	\N	\N
1024	341	Saeah Jihan Qurrotu' ainii	3277024510970018	082115475972	Perempuan	Kawin	Islam	Istri	1997-10-05	Guru	Aktif	2026-03-09 08:33:43.571185	\N	\N
1025	341	Kayshila Freya Arrumaisha	3277024412240001	\N	Perempuan	Belum Kawin	Islam	Anak	2024-12-04	Belum/Tidak Bekerja	Aktif	2026-03-09 08:35:16.145295	\N	\N
1026	345	FAUZI SALEH SEFF	327703247680002	08122155647	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-07-24	Wiraswasta	Aktif	2026-03-09 08:36:37.62921	\N	\N
1027	342	Dadan Hadian	3277022708820016	081394606020	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-08-27	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-09 08:36:54.786911	\N	\N
1028	345	NATHIA RAHMAH	3277036601830006	081212744420	Perempuan	Kawin	Islam	Istri	1983-01-26	Mengurus Rumah Tangga	Aktif	2026-03-09 08:37:50.607184	\N	\N
1029	342	Irma Riksani Rahmah	3277026712790016	\N	Perempuan	Cerai Hidup	Islam	Istri	1979-12-17	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-09 08:38:56.105144	\N	\N
1030	345	MUHAMAD HAIKAL FAUZI SEEF	3277031807020001	087816762829	Laki-laki	Belum Kawin	Islam	Anak	2002-07-18	Pelajar/Mahasiswa	Aktif	2026-03-09 08:39:00.951213	\N	\N
1031	342	Muhammad Zaki Arrasyid	3277021006090006	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-06-10	Pelajar/Mahasiswa	Aktif	2026-03-09 08:40:00.211747	\N	\N
1032	345	NABIL FAUZI SEEF	3277032605040002	085103002371	Laki-laki	Belum Kawin	Islam	Anak	2004-05-26	Pelajar/Mahasiswa	Aktif	2026-03-09 08:40:04.115133	\N	\N
1033	345	FADHIL FAUZI SEEF	3277030607140002	081212744420	Laki-laki	Belum Kawin	Islam	Anak	2014-07-06	Pelajar/Mahasiswa	Aktif	2026-03-09 08:41:04.500307	\N	\N
1034	342	Muhammqd Zaidan Arrafi	3277023009100001	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-09-30	Pelajar/Mahasiswa	Aktif	2026-03-09 08:41:12.435784	\N	\N
1035	342	Dzakiyah Kamilah Khairunnisa	3277025811120002	\N	Laki-laki	Belum Kawin	Islam	Anak	2012-11-18	Pelajar/Mahasiswa	Aktif	2026-03-09 08:42:24.360231	\N	\N
1036	342	Fathimah Azzahra Sayyidatunnisa	3277026910160002	\N	Perempuan	Belum Kawin	Islam	Anak	2016-10-29	Pelajar/Mahasiswa	Aktif	2026-03-09 08:43:50.767206	\N	\N
1037	291	Aldo Fatur Rizwan	3277022710010002	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-10-27	Belum/Tidak Bekerja	Aktif	2026-03-09 13:57:35.859615	\N	\N
1039	291	Alda Siti Qomara	3277025410110002	\N	Perempuan	Belum Kawin	Islam	Anak	2011-10-14	Pelajar/Mahasiswa	Aktif	2026-03-09 14:07:26.135032	\N	\N
1038	291	Rivaldi Wira Guna	3277022404070003	\N	Laki-laki	Belum Kawin	Islam	Anak	2007-04-24	Pelajar/Mahasiswa	Aktif	2026-03-09 13:59:51.327424	\N	\N
1040	291	Rizqi Wiradana	3277021611180005	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-11-16	Pelajar/Mahasiswa	Aktif	2026-03-09 14:08:43.74239	\N	\N
1041	346	M. Soleh	3277021012890014	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-12-10	Karyawan Swasta	Aktif	2026-03-09 14:12:38.371599	\N	\N
1021	344	CINDY FEBRIAN	3277026302850005	081717170911	Perempuan	Kawin	Kristen	Istri	1985-02-23	Mengurus Rumah Tangga	Aktif	2026-03-09 08:31:33.354822	\N	Diploma IV/Strata I
1018	344	YULIUS	3277010707840027	085221298888	Laki-laki	Kawin	Kristen	Kepala Keluarga	1984-07-07	Wiraswasta	Aktif	2026-03-09 08:30:18.726144	\N	Diploma IV/Strata I
1042	346	Suci Budiyani	3277025302950013	085759061070	Perempuan	Kawin	Islam	Istri	1995-02-13	Mengurus Rumah Tangga	Aktif	2026-03-09 14:13:56.918477	\N	\N
1043	346	Qiana Qalesya	3277026501220001	\N	Perempuan	Belum Kawin	Islam	Anak	2022-01-25	Belum/Tidak Bekerja	Aktif	2026-03-09 14:14:55.29551	\N	\N
1044	347	Rohati	3277025606520002	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1952-06-16	Mengurus Rumah Tangga	Aktif	2026-03-10 04:29:17.627875	\N	\N
1045	348	Ai Lili Cahyani	3277036312770007	08988190722	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1977-12-23	Belum/Tidak Bekerja	Aktif	2026-03-10 04:33:49.023634	\N	\N
1046	349	Budi Sugiarto	3277022106680001	082116411080	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1968-06-21	Wiraswasta	Aktif	2026-03-10 04:37:08.258925	\N	\N
1047	349	Phutreza Muzaqi	3277022903040002	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-03-29	Pelajar/Mahasiswa	Aktif	2026-03-10 04:38:14.088032	\N	\N
1048	350	Suhartono	3277021711800005	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1980-11-17	Karyawan Swasta	Aktif	2026-03-10 04:42:31.115061	\N	\N
1049	350	Siti Karyati	3277026408780015	\N	Perempuan	Kawin	Islam	Istri	1978-08-24	Mengurus Rumah Tangga	Aktif	2026-03-10 04:43:39.228163	\N	\N
1050	350	Shandrina Alaizya Putri	3277024302050002	\N	Perempuan	Belum Kawin	Islam	Anak	2005-02-03	Pelajar/Mahasiswa	Aktif	2026-03-10 04:44:57.628945	\N	\N
1051	351	Imas Komariah	3277025303610006	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1961-03-13	Mengurus Rumah Tangga	Aktif	2026-03-10 04:49:32.680654	\N	\N
1052	351	Sarah Musdalifah	3277025210990005	\N	Perempuan	Belum Kawin	Islam	Anak	1999-10-12	Belum/Tidak Bekerja	Aktif	2026-03-10 04:50:29.043735	\N	\N
1053	352	Diar Maulana	3277020706010018	085155275022	Laki-laki	Kawin	Islam	Kepala Keluarga	2001-06-07	Wiraswasta	Aktif	2026-03-10 04:56:07.997734	\N	\N
1054	352	Fenti Susanti	3217085101010003	081572958150	Perempuan	Kawin	Islam	Istri	2001-01-11	Mengurus Rumah Tangga	Aktif	2026-03-10 04:57:49.985296	\N	\N
1055	352	Diajeng Sukma Ayu	3277024905250003	\N	Perempuan	Belum Kawin	Islam	Anak	2025-05-09	Belum/Tidak Bekerja	Aktif	2026-03-10 04:58:49.214031	\N	\N
1056	353	Heri Nur Rahmat	3277032402860014	085798279924	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-02-24	Karyawan Swasta	Aktif	2026-03-10 05:02:43.333169	\N	\N
1057	353	Cucu Purnama	3277024106860034	085864233213	Perempuan	Kawin	Islam	Istri	1986-06-01	Mengurus Rumah Tangga	Aktif	2026-03-10 05:03:59.40401	\N	\N
1058	353	Farannisa Alzena Badzlin	3277026106130006	\N	Perempuan	Belum Kawin	Islam	Anak	2013-06-21	Pelajar/Mahasiswa	Aktif	2026-03-10 05:05:28.851976	\N	\N
1059	353	Fashania Allena Badzlin	3277026306200006	\N	Perempuan	Belum Kawin	Islam	Anak	2020-06-23	Belum/Tidak Bekerja	Aktif	2026-03-10 05:06:53.768275	\N	\N
1060	354	Akhmad Syauqi	3277021912640005	081313413927	Laki-laki	Kawin	Islam	Kepala Keluarga	1964-12-19	Belum/Tidak Bekerja	Aktif	2026-03-10 07:15:02.351245	\N	\N
1061	354	Sari Dewi	3277026912680013	085321377729	Perempuan	Kawin	Islam	Istri	1968-12-29	Mengurus Rumah Tangga	Aktif	2026-03-10 07:16:24.226693	\N	\N
1062	354	Nahri Khadijah	3277026304920004	\N	Perempuan	Belum Kawin	Islam	Anak	1992-04-23	Karyawan Swasta	Aktif	2026-03-10 07:18:35.614667	\N	\N
1063	354	Rayhan Muhammad	3277022810970009	\N	Laki-laki	Belum Kawin	Islam	Anak	1997-10-28	Karyawan Swasta	Aktif	2026-03-10 07:19:46.762834	\N	\N
1064	354	Raiyan Niyaza Ghaus	3277020204080005	\N	Laki-laki	Belum Kawin	Islam	Anak	2008-04-02	Pelajar/Mahasiswa	Aktif	2026-03-10 07:21:16.867128	\N	\N
1065	356	RANGGA MARANTIKA	3277022103840005	08112059666	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-03-21	Karyawan Swasta	Aktif	2026-03-10 07:21:28.525307	\N	\N
1066	356	ASTRI HASTRIANI	3277024809840019	08112275306	Perempuan	Kawin	Islam	Istri	1984-09-08	Guru	Aktif	2026-03-10 07:24:01.090287	\N	\N
1067	356	KHANSA NABIHA NUR SABIYA	3277024702100002	08112275306	Perempuan	Belum Kawin	Islam	Anak	2010-02-07	Pelajar/Mahasiswa	Aktif	2026-03-10 07:26:08.357839	\N	\N
1068	356	SOFIYA ADARA NUR XAVIERA	3277025905150003	08112275036	Laki-laki	Belum Kawin	Islam	Anak	2015-05-19	Pelajar/Mahasiswa	Aktif	2026-03-10 07:27:26.366834	\N	\N
1069	356	RAFI AL FATIH ATHALLAH	3277020211190004	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-11-02	Pelajar/Mahasiswa	Aktif	2026-03-10 07:29:23.025437	\N	\N
1070	356	HENNY KUSTIANI	3277024608490002	\N	Laki-laki	Cerai Mati	Islam	Famili Lain	1949-08-06	Belum/Tidak Bekerja	Aktif	2026-03-10 07:30:49.441397	\N	\N
1071	357	ALBERTUS WISNU NUGROHO	3277011611850029	08999278181	Laki-laki	Kawin	Hindu	Kepala Keluarga	1985-11-16	Karyawan Swasta	Aktif	2026-03-10 07:33:42.06674	\N	\N
1072	357	NI PUTU ESTU PRANITI	3277026609890004	08999687009	Perempuan	Kawin	Hindu	Istri	1989-09-26	Karyawan Swasta	Aktif	2026-03-10 07:35:24.696469	\N	\N
1073	358	NI NYOMAN RIDANI	3277025008630007	081802187211	Perempuan	Cerai Hidup	Hindu	Kepala Keluarga	1963-08-10	Pensiunan	Aktif	2026-03-10 07:39:45.3394	\N	\N
1074	358	NI MADE DIASTI PUTRI	3277025309950020	081224601207	Perempuan	Belum Kawin	Hindu	Anak	1995-09-13	Karyawan BUMN	Aktif	2026-03-10 07:41:22.901888	\N	\N
1075	358	NI KOMANG PRASTITI DEWI	327702430401009	089672687049	Perempuan	Belum Kawin	Hindu	Anak	2001-04-03	Belum/Tidak Bekerja	Aktif	2026-03-10 07:42:43.161568	\N	\N
1076	355	Ryan Noveriand Rawhan 	3277021112890021	082119639986	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-12-11	Karyawan Swasta	Aktif	2026-03-10 07:42:51.435592	\N	\N
1077	355	Intan Cahya Ningrum	3204096900040006	\N	Perempuan	Kawin	Islam	Istri	1994-09-29	Guru	Aktif	2026-03-10 07:44:55.883346	\N	\N
1078	355	Sarah Zehiya Muthmainnah	3277025408170002	\N	Perempuan	Belum Kawin	Islam	Anak	2017-08-14	Pelajar/Mahasiswa	Aktif	2026-03-10 07:46:25.905358	\N	\N
1079	355	Ibrahim Ghazi Alp Arslan	3277020304200002	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-04-03	Pelajar/Mahasiswa	Aktif	2026-03-10 07:48:09.097115	\N	\N
1080	359	NUR KHALIQ AGUS PETERSON	3277020208680031	0895367341847	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-08-02	Belum/Tidak Bekerja	Aktif	2026-03-10 07:54:21.830395	\N	\N
1081	360	Nidyan Rayhan Warigalit	3277020906720016	08179228063	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-06-09	Kepolisian RI (POLRI)	Aktif	2026-03-10 07:55:33.284663	\N	\N
1083	359	MUHAMMAD RAFI NURFAIZI	3277021704010010	087891508502	Laki-laki	Belum Kawin	Islam	Anak	2001-04-17	Karyawan Swasta	Aktif	2026-03-10 07:57:14.303353	\N	\N
1084	360	Talitha Aurelia Warigalit	3277024311020014	\N	Perempuan	Belum Kawin	Islam	Anak	2002-11-03	Pelajar/Mahasiswa	Aktif	2026-03-10 07:58:13.378478	\N	\N
1085	360	Farras Budi Athari	3277025802110001	\N	Laki-laki	Belum Kawin	Islam	Anak	2011-02-18	Pelajar/Mahasiswa	Aktif	2026-03-10 07:59:27.706801	\N	\N
1087	362	YULIANI HAREFA	3277025105870016	081320011766	Perempuan	Kawin	Kristen	Istri	1987-05-11	Mengurus Rumah Tangga	Aktif	2026-03-10 08:01:51.565017	\N	\N
1088	361	Dwi Ariyanto	3276023105840001	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-05-31	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:02:18.067074	\N	\N
1089	362	YOBEDI BELIEF MIRACLE DAELI	3277020402090004	081320011766	Laki-laki	Belum Kawin	Kristen	Anak	2009-02-04	Pelajar/Mahasiswa	Aktif	2026-03-10 08:03:48.765559	\N	\N
1090	361	Salma Fauziyah	3277024206950013	\N	Perempuan	Kawin	Islam	Istri	1995-06-02	Mengurus Rumah Tangga	Aktif	2026-03-10 08:04:30.07242	\N	\N
1091	362	OPHELIA TRIXI DAELI	3277024207110004	\N	Perempuan	Belum Kawin	Kristen	Anak	2011-07-02	Pelajar/Mahasiswa	Aktif	2026-03-10 08:04:42.27357	\N	\N
1092	362	JULIA HAGA COLEEN DAELI	3277027103170005	\N	Perempuan	Belum Kawin	Kristen	Anak	2017-03-31	Pelajar/Mahasiswa	Aktif	2026-03-10 08:06:02.417991	\N	\N
1093	361	Razka Muhammad Arsyad 	3277020804200001	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-04-08	Belum/Tidak Bekerja	Aktif	2026-03-10 08:06:17.775126	\N	\N
1094	363	SANDRA PERMANA	3205311009890003	08570349318	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-09-10	Wiraswasta	Aktif	2026-03-10 08:09:13.123229	\N	\N
1095	363	TIKA TRISNAWATI	3273035810890015	085720349318	Perempuan	Kawin	Islam	Istri	1989-10-18	Karyawan Swasta	Aktif	2026-03-10 08:10:19.895321	\N	\N
1096	364	Suhartoyo	3277021009690014	085794310994	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-09-10	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:10:31.286251	\N	\N
1097	364	Sukmanawati	32770265011660001	\N	Perempuan	Kawin	Islam	Istri	1966-01-25	Mengurus Rumah Tangga	Aktif	2026-03-10 08:11:42.752428	\N	\N
1098	364	Salman Fauzi 	3277020105010013	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-05-01	Pelajar/Mahasiswa	Aktif	2026-03-10 08:13:24.697661	\N	\N
1099	365	HENHEN SUHENDAR	3277020803660012	082130218319	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1966-03-08	Pensiunan	Aktif	2026-03-10 08:14:36.165574	\N	\N
1100	365	NAUFAL HISYAM	3277020202970013	082130218319	Laki-laki	Belum Kawin	Islam	Anak	1997-02-02	Belum/Tidak Bekerja	Aktif	2026-03-10 08:15:32.92468	\N	\N
1101	365	VALISHA HANIFATI	3277026012030004	\N	Perempuan	Belum Kawin	Islam	Anak	2003-12-20	Pelajar/Mahasiswa	Aktif	2026-03-10 08:16:44.195607	\N	\N
1256	411	MARDHIYAH MAISARO MUTHMAINNAH	3277027006210002	\N	Perempuan	Belum Kawin	Islam	Anak	2021-05-30	Pelajar/Mahasiswa	Aktif	2026-03-12 08:20:19.800958	\N	Tidak/Belum Tamat SD
1103	367	DANIEL FAJAR PUSPITA	3306061307860006	085729927085	Laki-laki	Kawin	Kristen	Kepala Keluarga	1986-07-13	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:19:28.112219	\N	\N
1104	367	SEKAR AJI CAHYANINGTYAS	3306086510860005	085729927085	Perempuan	Kawin	Kristen	Istri	1986-10-25	Karyawan Swasta	Aktif	2026-03-10 08:21:05.823245	\N	\N
1105	367	RAHAJENG PUTRI PUSPITA	3306065907120002	\N	Perempuan	Belum Kawin	Kristen	Anak	2012-07-19	Pelajar/Mahasiswa	Aktif	2026-03-10 08:22:24.922516	\N	\N
1106	367	RAHARDIAN AJI PUSPITA	3277022807150001	\N	Laki-laki	Belum Kawin	Kristen	Anak	2015-07-28	Pelajar/Mahasiswa	Aktif	2026-03-10 08:23:19.340097	\N	\N
1107	369	Sarimanah	3277025708650010	081387311701	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1965-08-17	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:25:28.150864	\N	\N
1108	370	SUDJONO MOCHTAR	3277020504530011	081573082523	Laki-laki	Kawin	Kristen	Kepala Keluarga	1953-04-05	Belum/Tidak Bekerja	Aktif	2026-03-10 08:26:20.014534	\N	\N
1109	370	YANTI GUNAWAN	3277025512580010	087822151910	Perempuan	Belum Kawin	Kristen	Istri	1958-12-15	Mengurus Rumah Tangga	Aktif	2026-03-10 08:27:18.019301	\N	\N
1110	368	Agus Hermawan	3217150205760032	081322788788	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-05-02	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:27:50.077853	\N	\N
1111	370	EDO MARTIANO	3277022603820015	08122332086	Laki-laki	Belum Kawin	Kristen	Anak	1982-03-26	Karyawan Swasta	Aktif	2026-03-10 08:28:43.770981	\N	\N
1112	370	ERWIN JUNIARDI	3277022406880001	087821728084	Laki-laki	Belum Kawin	Kristen	Anak	1988-06-24	Karyawan Swasta	Aktif	2026-03-10 08:30:15.258864	\N	\N
1113	368	Lyna Meylina	3217155505780018	083829913311	Perempuan	Kawin	Islam	Istri	1978-05-15	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-10 08:30:23.044416	\N	\N
1114	368	Aryasatya Putra Hermawan	3217151802120001	\N	Laki-laki	Belum Kawin	Islam	Anak	2012-02-18	Pelajar/Mahasiswa	Aktif	2026-03-10 08:36:38.859727	\N	\N
1115	371	RENDI KRESNA JULIAN	3204100107980005	087834475209	Laki-laki	Kawin	Islam	Kepala Keluarga	1998-07-01	Karyawan Swasta	Aktif	2026-03-10 08:36:47.159866	\N	\N
1116	371	ANNISA CAHAYAWATI	3273095502980002	081220413055	Perempuan	Kawin	Islam	Istri	1998-02-15	Karyawan Swasta	Aktif	2026-03-10 08:38:04.518864	\N	\N
1117	368	Rayya Ghaniya Putri Hermawan	3217154712140002	\N	Perempuan	Belum Kawin	Islam	Anak	2014-12-07	Pelajar/Mahasiswa	Aktif	2026-03-10 08:38:09.928786	\N	\N
1118	372	E RATNA NINGSIH	3273096305600002	081394466900	Perempuan	Kawin	Islam	Istri	1960-05-23	Mengurus Rumah Tangga	Aktif	2026-03-10 08:42:39.91379	\N	\N
1119	373	Nusro Prayitno	3277020705700022	081220901249	Laki-laki	Kawin	Islam	Kepala Keluarga	1970-05-07	Karyawan Swasta	Aktif	2026-03-10 08:58:25.521261	\N	\N
1120	373	Siti Sarwiyah	3277026101730016	081321970094	Perempuan	Kawin	Islam	Istri	1973-01-21	Karyawan Swasta	Aktif	2026-03-10 09:00:14.367048	\N	\N
1121	373	Ilham Syaeful Reza	3277020703980001	\N	Laki-laki	Belum Kawin	Islam	Anak	1998-03-07	Karyawan Swasta	Aktif	2026-03-10 09:01:52.919962	\N	\N
1122	373	Raihan Mualana Firdaus	3277020110040006	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-10-01	Pelajar/Mahasiswa	Aktif	2026-03-10 09:02:50.900425	\N	\N
1082	359	KOMARIAH	3277027008690001	0895619817050	Perempuan	Kawin	Islam	Istri	1969-08-30	Mengurus Rumah Tangga	Aktif	2026-03-10 07:55:43.253603	\N	\N
1123	375	BAY CHAERIYAH	3277024506570001	085176963003	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1957-06-05	Mengurus Rumah Tangga	Aktif	2026-03-11 07:23:14.990952	\N	\N
1124	377	Aries Hartanto	3201021904730007	087889905030	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-04-19	Karyawan Swasta	Aktif	2026-03-11 07:26:12.587731	\N	\N
1125	375	FAZRI ESPANDIARI CORRY	3277023103840007	085176963003	Laki-laki	Belum Kawin	Islam	Anak	1984-03-31	Karyawan Swasta	Aktif	2026-03-11 07:26:12.87911	\N	\N
1126	377	Rulyana Kartikasary Ruchijat	3277024102720037	\N	Perempuan	Kawin	Islam	Istri	1972-01-02	Mengurus Rumah Tangga	Aktif	2026-03-11 07:27:35.280597	\N	\N
1259	412	Fayza Rahmillah Priatna	3277025802150001	\N	Perempuan	Belum Kawin	Islam	Anak	2015-02-18	Pelajar/Mahasiswa	Aktif	2026-03-12 08:23:21.196725	\N	Tamat SD/Sederajat
1128	377	Shazkia Melvabella Aprilia	3277026004030006	\N	Perempuan	Belum Kawin	Islam	Anak	2003-04-20	Perawat	Aktif	2026-03-11 07:29:09.128627	\N	\N
1129	378	ADFENTRIA DAELI	3277036411830001	082258118895	Perempuan	Kawin	Kristen	Istri	1983-11-24	Mengurus Rumah Tangga	Aktif	2026-03-11 07:30:53.056727	\N	\N
1130	376	Mochamad Arifin	3277020203770013	081321747714	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-03-02	Karyawan Swasta	Aktif	2026-03-11 07:31:24.393575	\N	\N
1131	378	KEFAS JANICE DAELI	3277032609090003	\N	Laki-laki	Belum Kawin	Kristen	Anak	2009-09-26	Pelajar/Mahasiswa	Aktif	2026-03-11 07:31:53.104891	\N	\N
1132	376	Rina Arfiani Ulfah	3277024512840001	\N	Perempuan	Kawin	Islam	Istri	1981-12-05	Karyawan Swasta	Aktif	2026-03-11 07:32:38.131088	\N	\N
1133	378	WINIFRED JOFITA DAELI	3277036210120004	\N	Perempuan	Belum Kawin	Kristen	Anak	2012-10-22	Pelajar/Mahasiswa	Aktif	2026-03-11 07:33:01.205689	\N	\N
1134	376	Tristan Kenzie Rafif	3277020604100001	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-04-06	Pelajar/Mahasiswa	Aktif	2026-03-11 07:33:39.585015	\N	\N
1135	376	Alvis Raffasya Aqlan	3277021410110001	\N	Laki-laki	Belum Kawin	Islam	Anak	2011-10-14	Pelajar/Mahasiswa	Aktif	2026-03-11 07:34:46.719795	\N	\N
1136	378	CELESTYN AVIGAEL DAELI	3277026405160003	\N	Perempuan	Belum Kawin	Kristen	Anak	2016-05-24	Pelajar/Mahasiswa	Aktif	2026-03-11 07:35:07.917259	\N	\N
1137	378	GEONA JOEVANKA DAELI	3277025708200002	\N	Perempuan	Belum Kawin	Kristen	Anak	2020-08-17	Pelajar/Mahasiswa	Aktif	2026-03-11 07:36:06.568834	\N	\N
1138	374	Sardi Naik	3273040701860001	085222357077	Laki-laki	Kawin	Katolik	Kepala Keluarga	1986-01-07	Wiraswasta	Aktif	2026-03-11 07:39:42.853829	\N	\N
1139	374	Melia Sinaga 	1275044505890013	082364529966	Perempuan	Kawin	Katolik	Istri	1989-05-05	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-11 07:41:19.786887	\N	\N
1140	380	HENDRA GUNARA	3277022705730001	087821190987	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-05-27	Wiraswasta	Aktif	2026-03-11 07:41:34.262108	\N	\N
1141	380	SURANI	3277025402740013	087821730942	Perempuan	Kawin	Islam	Istri	21974-04-11	Pegawai Negeri Sipil (PNS)	Aktif	2026-03-11 07:42:34.342628	\N	\N
1142	374	Andro Kenrick Habinsaran Limbong	3273040903170003	\N	Laki-laki	Belum Kawin	Katolik	Anak	2017-03-09	Pelajar/Mahasiswa	Aktif	2026-03-11 07:42:59.316193	\N	\N
1143	374	Axelya Uliana Limbong	3273044907180005	\N	Perempuan	Belum Kawin	Katolik	Anak	2018-07-09	Pelajar/Mahasiswa	Aktif	2026-03-11 07:44:25.771069	\N	\N
1144	380	AHLAM NAUVAL MAHENDRA	3277022209010013	088802322763	Laki-laki	Belum Kawin	Islam	Anak	2001-09-22	Belum/Tidak Bekerja	Aktif	2026-03-11 07:44:32.131511	\N	\N
1145	380	NAURA KAMILIA MAHENDRA	3277025311060001	0882000538364	Perempuan	Belum Kawin	Islam	Anak	2006-11-13	Pelajar/Mahasiswa	Aktif	2026-03-11 07:45:32.900579	\N	\N
1127	378	TELITI DAELI	3277031604850022	082258118895	Laki-laki	Kawin	Kristen	Kepala Keluarga	1985-04-16	Belum/Tidak Bekerja	Aktif	2026-03-11 07:29:05.165372	\N	\N
1147	382	Mia Karmelita	3277026104910003	087849948965	Perempuan	Belum Kawin	Islam	Anak	1991-04-21	Karyawan Swasta	Aktif	2026-03-11 07:55:33.845457	\N	\N
1146	382	Popi Supiati	3277026510550007	089512736676	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1955-10-25	Mengurus Rumah Tangga	Aktif	2026-03-11 07:52:54.925748	\N	\N
1148	383	CRISTIANTO WIBISONO	3277021606710009	081321105584	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-06-14	Karyawan Swasta	Aktif	2026-03-11 07:56:57.322774	\N	\N
1149	383	WAHYU NINGSIH	3277027003760010	\N	Perempuan	Kawin	Islam	Istri	1976-03-30	Mengurus Rumah Tangga	Aktif	2026-03-11 07:58:28.000095	\N	\N
1150	381	Amirrudin	3277020105690001	087779194333	Laki-laki	Kawin	Islam	Kepala Keluarga	1969-05-01	Karyawan Swasta	Aktif	2026-03-11 07:58:48.856026	\N	\N
1151	383	MUHAMMAD ALDIANSYAH WIBISONO	3277020107000119	\N	Laki-laki	Belum Kawin	Islam	Anak	\N	Karyawan Swasta	Aktif	2026-03-11 07:59:58.536956	\N	\N
1152	383	FEBRIAN RIFQI ZUHAIR	3277020802040002	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-02-08	Kepolisian RI (POLRI)	Aktif	2026-03-11 08:01:04.436989	\N	\N
1153	381	Ernyati Anwar	3277024205670007	3277024205670007	Perempuan	Kawin	Islam	Istri	1967-05-02	Pensiunan	Aktif	2026-03-11 08:01:14.367457	\N	\N
1154	383	FAIZA RIFA SABIRA RAMADHANI	3277024909080005	\N	Perempuan	Belum Kawin	Islam	Anak	2008-09-09	Pelajar/Mahasiswa	Aktif	2026-03-11 08:02:14.52475	\N	\N
1155	381	Muhammad Daffa Haekal I'tisham	3277021312040001	081932948693	Laki-laki	Belum Kawin	Islam	Anak	2004-12-13	Pelajar/Mahasiswa	Aktif	2026-03-11 08:04:31.693946	\N	\N
1156	384	AJI HANDOYO	3277022301720008	08112009525	Laki-laki	Kawin	Islam	Kepala Keluarga	1972-01-23	Karyawan Swasta	Aktif	2026-03-11 08:06:19.0754	\N	\N
1157	384	LILIEK SAVITRI SULISTYOWATI	3277026103720009	0811213377	Perempuan	Kawin	Islam	Istri	1972-03-21	Mengurus Rumah Tangga	Aktif	2026-03-11 08:07:55.665116	\N	\N
1158	384	INTAN SHAFA SULISTYO AJI	3277026109010014	081224777921	Perempuan	Belum Kawin	Islam	Anak	2001-09-21	Karyawan Swasta	Aktif	2026-03-11 08:13:15.743079	\N	\N
1160	384	FARRELL AL GHIFARI BINTANG SULISTYOAJI	3277022303060006	081327343420	Laki-laki	Belum Kawin	Islam	Anak	2006-03-23	Pelajar/Mahasiswa	Aktif	2026-03-11 08:14:50.28259	\N	\N
1161	388	LANA DWI TIFANNY	3277024210910015	087780691041	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1991-10-02	Mengurus Rumah Tangga	Aktif	2026-03-11 08:17:54.481301	\N	\N
1162	386	Bram Hariartono	3573012901880004	081212677949	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-01-29	Karyawan Swasta	Aktif	2026-03-11 08:18:41.443242	\N	\N
1163	388	FIRLANDO BACHRUN	3277023008110001	087780691041	Laki-laki	Belum Kawin	Islam	Anak	2011-08-30	Pelajar/Mahasiswa	Aktif	2026-03-11 08:19:18.153738	\N	\N
1164	386	Ayudyapasca Praharasti	35730346028700005	087859800939	Perempuan	Kawin	Islam	Istri	1987-02-06	Mengurus Rumah Tangga	Aktif	2026-03-11 08:20:32.783452	\N	\N
1165	389	RADEN MUHAMMAD ANDY YUDAPRATAMA	3273281410910001	081288948101	Laki-laki	Kawin	Islam	Kepala Keluarga	1991-10-14	Karyawan BUMN	Aktif	2026-03-11 08:22:17.564318	\N	\N
1166	386	Cantiqa Mazaya Zahra	3573034509140002	\N	Perempuan	Belum Kawin	Islam	Anak	2014-09-05	Pelajar/Mahasiswa	Aktif	2026-03-11 08:23:08.862026	\N	\N
1167	389	RESSI FANDANI	3277025609890010	082258620524	Perempuan	Kawin	Islam	Istri	1989-09-16	Karyawan BUMN	Aktif	2026-03-11 08:23:50.4327	\N	\N
1168	389	RAFA SAKHA MAHENDRA	3277020606200003	082258620524	Laki-laki	Belum Kawin	Islam	Anak	2020-06-06	Pelajar/Mahasiswa	Aktif	2026-03-11 08:24:57.466583	\N	\N
1169	389	RAZKA ZAYN DAVIANDRA	3277022803250001	082258620524	Laki-laki	Belum Kawin	Islam	Anak	2025-03-28	Belum/Tidak Bekerja	Aktif	2026-03-11 08:25:57.693835	\N	\N
1171	390	NIENA KENCANA SARI	3277024309640015	081214781904	Perempuan	Kawin	Islam	Istri	1964-09-03	Mengurus Rumah Tangga	Aktif	2026-03-11 08:30:55.916332	\N	\N
1172	391	Wahjudi Sugiharto	3277023003670008	\N	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1967-03-30	Buruh Harian Lepas	Aktif	2026-03-11 08:34:01.607717	\N	\N
1177	392	RIO DERMAWAN SAPTARI	3277031302020002	081904362700	Laki-laki	Belum Kawin	Islam	Anak	2002-02-13	Belum/Tidak Bekerja	Aktif	2026-03-11 08:37:13.60983	\N	\N
1159	387	Manan Suherman	3277020407940008	085648362547	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1994-07-04	Buruh Harian Lepas	Aktif	2026-03-11 08:14:34.579596	/uploads/ktp/1773218065831-kkx8bryr0w9.pdf	\N
1173	392	ANI MASNI	3277024202750042	081221154323	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1975-02-18	Mengurus Rumah Tangga	Aktif	2026-03-11 08:34:42.801712	\N	\N
1174	391	Ika Lovita	3277026009690018	0817207758	Perempuan	Kawin	Islam	Istri	1969-09-20	Mengurus Rumah Tangga	Aktif	2026-03-11 08:35:38.692339	\N	\N
1175	392	DIKI DERMAWAN SAPTARI	3277032809960017	087733172507	Laki-laki	Belum Kawin	Islam	Anak	1996-09-28	Belum/Tidak Bekerja	Aktif	2026-03-11 08:35:58.790608	\N	\N
1176	391	Nafan Rasyad	3277021403010011	\N	Laki-laki	Belum Kawin	Islam	Anak	2001-03-14	Karyawan Swasta	Aktif	2026-03-11 08:36:31.323598	\N	\N
1178	391	Izzanu Abduh 	3277021001030015	\N	Laki-laki	Belum Kawin	Islam	Anak	2003-01-10	Pelajar/Mahasiswa	Aktif	2026-03-11 08:37:30.910774	\N	\N
1179	391	Altair Arrazi	3277023108040003	\N	Laki-laki	Belum Kawin	Islam	Anak	2004-08-31	Pelajar/Mahasiswa	Aktif	2026-03-11 08:38:28.476038	\N	\N
1180	391	Askana Sakhi	3277025410120001	\N	Perempuan	Belum Kawin	Islam	Anak	2012-10-14	Pelajar/Mahasiswa	Aktif	2026-03-11 08:39:23.452506	\N	\N
1181	394	ANGGI NUR SETIAWAN	3204322408890006	081221869142	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-08-24	Karyawan Swasta	Aktif	2026-03-11 08:40:52.786747	\N	\N
1182	394	SHELLA APRIANI	3277024404900007	081321106718	Perempuan	Belum Kawin	Islam	Istri	1990-04-04	Karyawan Swasta	Aktif	2026-03-11 08:43:01.828605	\N	\N
1257	412	Nailah Khairunnisa Priatna	3277025004070002	\N	Perempuan	Belum Kawin	Islam	Anak	2007-04-10	Pelajar/Mahasiswa	Aktif	2026-03-12 08:20:40.759288	\N	SLTA/Sederajat
1183	393	Taufik Andriana	3217160202980003	083866331251	Laki-laki	Kawin	Islam	Kepala Keluarga	1998-02-02	Buruh Harian Lepas	Aktif	2026-03-11 08:43:28.324834	/uploads/ktp/1773218608881-ulep7yafspo.pdf	\N
1185	394	MAHESWARI AGISHA QUR'ANI	3277027108180004	\N	Perempuan	Belum Kawin	Islam	Anak	2018-08-31	Pelajar/Mahasiswa	Aktif	2026-03-11 08:44:28.750044	\N	\N
1186	393	Rika Hana Kartika	3277024301020012	089638998794	Perempuan	Kawin	Islam	Istri	2002-01-03	Mengurus Rumah Tangga	Aktif	2026-03-11 08:46:55.445144	/uploads/ktp/1773218815991-jl691gfrvh.pdf	\N
1187	396	YUDI SUNARTO WIDJAJA	32770215087690010	0818620688	Laki-laki	Kawin	Kristen	Kepala Keluarga	1969-08-15	Karyawan Swasta	Aktif	2026-03-11 08:49:09.44006	\N	\N
1188	395	Mellyana Liliandriani	3277024707810034	0895381761313	Perempuan	Kawin	Islam	Istri	1981-07-07	Mengurus Rumah Tangga	Aktif	2026-03-11 08:49:59.383226	\N	\N
1189	396	SUSANTI	3277025703720018	\N	Perempuan	Kawin	Kristen	Istri	1972-03-17	Mengurus Rumah Tangga	Aktif	2026-03-11 08:50:12.758889	\N	\N
1190	396	JANE JOSEPHINE WIDJAJA	3277026006020019	\N	Perempuan	Belum Kawin	Kristen	Anak	2002-06-20	Pelajar/Mahasiswa	Aktif	2026-03-11 08:51:16.265481	\N	\N
1191	396	CINDY CAROLINE WIDJAJA	3277026709050001	\N	Perempuan	Belum Kawin	Kristen	Anak	2005-09-27	Pelajar/Mahasiswa	Aktif	2026-03-11 08:52:25.062343	\N	\N
1192	396	AUDREY ADELINE	3277026705170001	\N	Perempuan	Belum Kawin	Kristen	Anak	2017-05-27	Pelajar/Mahasiswa	Aktif	2026-03-11 08:53:36.982965	\N	\N
1193	397	Diki	3205210704010006	08976342370	Laki-laki	Kawin	Islam	Kepala Keluarga	2001-04-07	Karyawan Swasta	Aktif	2026-03-11 08:55:11.062893	\N	\N
1194	397	Elsa Ratnasari Hermawan	3277025306010008	\N	Perempuan	Kawin	Islam	Istri	2001-06-13	Karyawan Swasta	Aktif	2026-03-11 08:56:24.568693	\N	\N
1195	397	Muhammad Albian Dikifallah	3277021907240003	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-07-19	Belum/Tidak Bekerja	Aktif	2026-03-11 08:57:29.549877	\N	\N
1196	400	Asep Dandi 	3273300401750002	082119726313	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-01-04	Buruh Harian Lepas	Aktif	2026-03-11 09:01:39.265364	\N	\N
1197	400	Neneng Meta Rofiqoh	3273304902780001	082119726313	Laki-laki	Kawin	Islam	Anak	1978-02-09	Mengurus Rumah Tangga	Aktif	2026-03-11 10:02:17.761203	\N	\N
1198	400	Friska Mafeesa Putri Danita	3277026701080008	085122166674	Perempuan	Belum Kawin	Islam	Anak	2008-01-27	Pelajar/Mahasiswa	Aktif	2026-03-11 10:03:50.510325	\N	\N
1199	400	Zivanna Florina Putri Danita	3273306608090002	\N	Perempuan	Belum Kawin	Islam	Anak	2009-08-26	Pelajar/Mahasiswa	Aktif	2026-03-11 10:05:12.241829	\N	\N
1200	400	Valisha Syamra Azzalea Putri Danita	3277025612180003	\N	Perempuan	Belum Kawin	Islam	Anak	2018-12-16	Pelajar/Mahasiswa	Aktif	2026-03-11 10:06:43.03588	\N	\N
1201	401	Rifky Nurmansyah	3217060603880012	082140000698	Laki-laki	Kawin	Islam	Kepala Keluarga	1988-03-06	Karyawan Swasta	Aktif	2026-03-11 12:46:24.2408	\N	\N
1202	401	Margianti	1810034110930001	085764469720	Perempuan	Kawin	Islam	Istri	1993-10-01	Mengurus Rumah Tangga	Aktif	2026-03-11 12:47:46.07757	\N	\N
1203	401	Miqdam Setia Putra 	3217100301050008	\N	Laki-laki	Belum Kawin	Islam	Famili Lain	2005-01-03	Pelajar/Mahasiswa	Aktif	2026-03-11 12:49:43.831454	\N	\N
1204	401	Shakira Anjoulie June	3217104706060011	\N	Perempuan	Belum Kawin	Islam	Famili Lain	2006-06-07	Pelajar/Mahasiswa	Aktif	2026-03-11 12:51:01.109479	\N	\N
1206	402	Agisza Savitri	3277026007950008	\N	Perempuan	Kawin	Islam	Istri	1995-07-20	Karyawan Swasta	Aktif	2026-03-11 12:56:08.055529	\N	\N
1205	402	Vicky Zulfiqar	3277020108930010	08122041144	Laki-laki	Kawin	Islam	Kepala Keluarga	1993-08-01	Wiraswasta	Aktif	2026-03-11 12:54:44.0741	\N	\N
1207	402	Zhifara Adreena Mecca	3277027101200003	\N	Perempuan	Belum Kawin	Islam	Anak	2020-01-31	Pelajar/Mahasiswa	Aktif	2026-03-11 12:57:37.457749	\N	\N
1208	402	Mafaza Kahfi Malik	3277022801210002	\N	Laki-laki	Belum Kawin	Islam	Anak	2021-01-28	Belum/Tidak Bekerja	Aktif	2026-03-11 12:58:41.285789	\N	\N
1209	403	Ismiradi Oktavianto	3277020310670001	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1967-10-30	Karyawan Swasta	Aktif	2026-03-11 13:01:23.748385	\N	\N
1210	403	Ratu Yayu Suhayati	3277026001680009	08122041144	Perempuan	Kawin	Islam	Istri	1968-01-20	Mengurus Rumah Tangga	Aktif	2026-03-11 13:02:32.515995	\N	\N
1211	403	Rhamzy Fadhil Fauzan	3277021703990013	\N	Laki-laki	Belum Kawin	Islam	Anak	1999-03-17	Karyawan Swasta	Aktif	2026-03-11 13:03:39.012661	\N	\N
1184	395	Sandy Hermawan 	3277020303650021	081322265168	Laki-laki	Kawin	Islam	Kepala Keluarga	1965-03-03	Karyawan Swasta	Aktif	2026-03-11 08:43:45.847632	\N	\N
1212	278	Deni Andriyana	3277020407790021	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1979-07-04	Pedagang	Aktif	2026-03-12 05:10:27.373089	\N	\N
1213	278	Dewi Ratnasari Pebrianti	3205026002900003	\N	Perempuan	Kawin	Islam	Istri	1991-02-20	Mengurus Rumah Tangga	Aktif	2026-03-12 05:12:07.156932	\N	\N
1214	278	Fachrul A'inul Yaqin	3277020210090005	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-10-02	Pelajar/Mahasiswa	Aktif	2026-03-12 05:13:12.358341	\N	\N
1215	278	Fatimah Shakila Khairina	3277024808180002	\N	Perempuan	Belum Kawin	Islam	Anak	2018-08-08	Pelajar/Mahasiswa	Aktif	2026-03-12 05:14:13.862216	\N	\N
1216	404	DR. IR. Redy Pryambada S, MBA	3174051510570002	0818757880	Laki-laki	Kawin	Islam	Kepala Keluarga	1957-10-15	Arsitek	Aktif	2026-03-12 05:18:06.220521	\N	\N
1217	404	Heni Nurhaeni	3277026805830029	081363181983	Perempuan	Kawin	Islam	Istri	1983-05-28	Mengurus Rumah Tangga	Aktif	2026-03-12 05:19:30.091622	\N	\N
1218	404	Zahran Satria Nugraha	3277021206090005	081363162009	Laki-laki	Belum Kawin	Islam	Anak	2009-06-12	Pelajar/Mahasiswa	Aktif	2026-03-12 05:20:42.083419	\N	\N
1219	404	Rezva Zahrany Nachelle	3277024704200004	\N	Perempuan	Belum Kawin	Islam	Anak	2020-04-07	Belum/Tidak Bekerja	Aktif	2026-03-12 05:21:36.539682	\N	\N
1220	405	Wedha Nibbanadhika	3273222401850001	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1985-01-24	Wiraswasta	Aktif	2026-03-12 05:26:41.010964	\N	\N
1221	405	Dianingtyas Mira Agustiani	3273026208850011	\N	Perempuan	Kawin	Islam	Istri	1985-08-22	Wiraswasta	Aktif	2026-03-12 05:27:54.841607	\N	\N
1222	405	Azzahra Indira Nayyarawedha	3273026007110004	\N	Perempuan	Belum Kawin	Islam	Anak	2011-07-20	Pelajar/Mahasiswa	Aktif	2026-03-12 05:29:07.578932	\N	\N
1223	405	Albimo Abdulmalik Sakhawedha	3273023005140011	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-05-23	Pelajar/Mahasiswa	Aktif	2026-03-12 05:30:05.267868	\N	\N
1224	405	Aleeya Nadhira Naishawedha	3277026602190004	\N	Perempuan	Belum Kawin	Islam	Anak	2019-02-26	Pelajar/Mahasiswa	Aktif	2026-03-12 05:31:23.273004	\N	\N
1225	406	Dewi Lisda Susanti	3278015501830004	\N	Perempuan	Kawin	Islam	Kepala Keluarga	1983-01-15	Mengurus Rumah Tangga	Aktif	2026-03-12 05:37:19.878347	\N	\N
1226	406	Yusup Mulyadi	3278012403060004	\N	Laki-laki	Belum Kawin	Islam	Anak	2006-03-24	Buruh Harian Lepas	Aktif	2026-03-12 05:38:08.928567	\N	\N
1227	406	Hersan Risnandar	3278011409100003	\N	Laki-laki	Belum Kawin	Islam	Anak	2010-09-14	Pelajar/Mahasiswa	Aktif	2026-03-12 05:39:07.911331	\N	\N
1228	406	Herdiani Putri	3277024412110001	\N	Perempuan	Belum Kawin	Islam	Anak	2011-12-04	Pelajar/Mahasiswa	Aktif	2026-03-12 05:39:53.231651	\N	\N
1229	406	Marsella Anjani	3277024803160006	\N	Perempuan	Belum Kawin	Islam	Anak	2016-03-08	Pelajar/Mahasiswa	Aktif	2026-03-12 05:40:45.465775	\N	\N
1230	406	Niken Fuji Jayanti	3277026608190001	\N	Perempuan	Belum Kawin	Islam	Anak	2019-08-26	Pelajar/Mahasiswa	Aktif	2026-03-12 05:41:37.930442	\N	\N
1231	407	Jimun	3277020808730035	085624071943	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-08-08	Karyawan Swasta	Aktif	2026-03-12 05:44:06.974436	\N	\N
1232	407	Jumilah	3277024302780015	0895346465589	Perempuan	Kawin	Islam	Istri	1978-02-03	Mengurus Rumah Tangga	Aktif	2026-03-12 05:45:11.195167	\N	\N
1233	407	Panji Pratama	3277021208010024	081395282598	Laki-laki	Belum Kawin	Islam	Anak	2001-08-12	Pelajar/Mahasiswa	Aktif	2026-03-12 05:46:21.633019	\N	\N
1234	407	Khayra Fayyola Nadhifa	3277024605160002	\N	Perempuan	Belum Kawin	Islam	Anak	2016-05-06	Pelajar/Mahasiswa	Aktif	2026-03-12 05:47:35.04087	\N	\N
1235	407	Djoko Sugiri	3520140208990002	\N	Laki-laki	Belum Kawin	Islam	Famili Lain	1999-08-02	Belum/Tidak Bekerja	Aktif	2026-03-12 05:48:48.799658	\N	\N
1236	409	RIAN NURDIANA	3277021405900005	085863500773	Laki-laki	Cerai Mati	Islam	Kepala Keluarga	1990-05-14	Karyawan Swasta	Aktif	2026-03-12 07:58:03.290616	\N	\N
1237	409	KHALIL ZHAFRAN EL GHIFARI	3277022309160002	\N	Laki-laki	Belum Kawin	Islam	Anak	2016-09-23	Pelajar/Mahasiswa	Aktif	2026-03-12 07:59:11.144217	\N	\N
1238	408	Muhamad Arbi Sulasmansyah	3207112505930003	085353294990	Laki-laki	Kawin	Islam	Kepala Keluarga	1993-05-25	Karyawan Swasta	Aktif	2026-03-12 08:00:17.529695	\N	Diploma IV/Strata I
1239	409	KHALIF GHIBRAN ALFARIZKY	3277023011170006	\N	Laki-laki	Belum Kawin	Islam	Anak	\N	Pelajar/Mahasiswa	Aktif	2026-03-12 08:00:40.335038	\N	Tidak/Belum Tamat SD
1240	408	Ranita Intan Sari	3277025004940023	085156044957	Perempuan	Kawin	Islam	Istri	1994-03-19	Mengurus Rumah Tangga	Aktif	2026-03-12 08:03:09.530418	\N	Akademi/Diploma III
1241	409	ALMAIRA BAHIRA NURDIANA	3277024208200004	\N	Perempuan	Belum Kawin	Islam	Anak	2020-08-02	Pelajar/Mahasiswa	Aktif	2026-03-12 08:03:29.578122	\N	Tidak/Belum Tamat SD
1242	409	KHABIB AMMAR ZAYN	3277020706240002	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-06-07	Belum/Tidak Bekerja	Aktif	2026-03-12 08:04:16.645019	\N	Belum Sekolah
1258	412	Khumaira Hanifah Priatna	3277026207100005	\N	Perempuan	Belum Kawin	Islam	Anak	2010-07-22	Pelajar/Mahasiswa	Aktif	2026-03-12 08:22:19.261839	\N	SLTP/Sederajat
1260	410	ERIKA NUR AGUSTINA RAHMAN	3277024508960005	083818589580	Perempuan	Belum Kawin	Islam	Anak	1996-08-05	Karyawan Swasta	Aktif	2026-03-12 08:26:18.052434	\N	Diploma IV/Strata I
1246	408	Salman El Ghazi Alfarizqi	3277021510230002	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-10-15	Belum/Tidak Bekerja	Aktif	2026-03-12 08:08:01.95508	\N	Belum Sekolah
1247	410	ASEP MUNANDAR	3277022901710015	08226872815	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-10-29	Buruh Harian Lepas	Aktif	2026-03-12 08:08:31.963306	\N	SLTA/Sederajat
1243	408	Maryam Azkiya Fathunnisa	3277024411200003	\N	Perempuan	Belum Kawin	Islam	Anak	2020-11-04	Belum/Tidak Bekerja	Aktif	2026-03-12 08:04:27.632298	\N	Belum Sekolah
1261	410	RIFQII RAMADAN	3277020210040003	085173130210	Laki-laki	Belum Kawin	Islam	Anak	2004-10-02	Pelajar/Mahasiswa	Aktif	2026-03-12 08:27:47.782319	\N	SLTA/Sederajat
1249	410	KOMARIAH	3277025806660010	083878185595	Perempuan	Kawin	Islam	Istri	1966-06-18	Mengurus Rumah Tangga	Aktif	2026-03-12 08:10:35.255231	\N	Diploma IV/Strata I
1250	411	RANDI KURNIAWAN	3277021712860010	082118014543	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-12-17	Karyawan Swasta	Aktif	2026-03-12 08:15:01.413937	\N	SLTA/Sederajat
1251	411	NINA RIESMAYANTY	3207294402930001	081220901930	Perempuan	Kawin	Islam	Istri	1993-02-04	Mengurus Rumah Tangga	Aktif	2026-03-12 08:16:10.481521	\N	SLTA/Sederajat
1262	413	Junaedi	3277021707820014	083833705107	Laki-laki	Kawin	Islam	Kepala Keluarga	1982-07-17	Buruh Harian Lepas	Aktif	2026-03-12 08:27:54.580823	\N	Tidak/Belum Tamat SD
1263	413	Lastri	3277024708830031	\N	Perempuan	Belum Kawin	Islam	Istri	1983-11-07	Mengurus Rumah Tangga	Aktif	2026-03-12 08:29:14.027385	\N	SLTP/Sederajat
1264	413	Muhamad Rafi Ramdani	3277021302080004	\N	Laki-laki	Belum Kawin	Islam	Anak	2008-02-13	Pelajar/Mahasiswa	Aktif	2026-03-12 08:30:39.671537	\N	SLTA/Sederajat
1265	413	Muhammad Rafka Ramdani	3277021611180006	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-11-16	Pelajar/Mahasiswa	Aktif	2026-03-12 08:32:11.838379	\N	SLTP/Sederajat
1266	414	Sofian	3277020301890001	087739719075	Laki-laki	Kawin	Islam	Kepala Keluarga	1989-01-03	Karyawan Swasta	Aktif	2026-03-12 08:38:58.206423	\N	SLTA/Sederajat
1267	414	Wida Yulia Ningsih	3217104809920009	081221530683	Perempuan	Kawin	Islam	Istri	1992-10-08	Mengurus Rumah Tangga	Aktif	2026-03-12 08:40:24.999515	\N	SLTA/Sederajat
1268	414	Muhamad Hamzah Adhiyastha Anfield	3277022808160004	\N	Laki-laki	Belum Kawin	Islam	Anak	2016-08-28	Pensiunan	Aktif	2026-03-12 08:41:31.520735	\N	Tamat SD/Sederajat
1269	414	Khalid Raffaza Gian Anfield	3277022910200003	\N	Laki-laki	Belum Kawin	Islam	Anak	2020-10-29	Pensiunan	Aktif	2026-03-12 08:42:47.367313	\N	Tidak/Belum Tamat SD
1270	415	Alis Nuraeni	3277025708690017	088223650365	Perempuan	Cerai Mati	Islam	Istri	1969-08-17	Mengurus Rumah Tangga	Aktif	2026-03-12 08:47:19.299401	\N	SLTP/Sederajat
1271	415	Yogi Ginanjar	3276020708910010	0895702952449	Laki-laki	Belum Kawin	Islam	Anak	1991-08-07	Buruh Tani/Perkebunan	Aktif	2026-03-12 08:48:56.958	\N	Diploma I/II
1272	415	Yolla Fauziah	3277026910020001	\N	Laki-laki	Belum Kawin	Islam	Anak	2002-10-29	Belum/Tidak Bekerja	Aktif	2026-03-12 08:50:26.875096	\N	SLTA/Sederajat
1273	417	Meka Wahyudi	3301061502860011	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1986-02-15	Perdagangan	Aktif	2026-03-12 08:54:47.41447	\N	Tamat SD/Sederajat
1274	417	Sartini	3301066601860001	\N	Perempuan	Kawin	Islam	Istri	1988-06-13	Ibu Rumah Tangga	Aktif	2026-03-12 08:56:20.740769	\N	SLTP/Sederajat
1275	417	Lisna Eka Saputri	3301064103090002	\N	Perempuan	Belum Kawin	Islam	Anak	2009-03-01	Pelajar/Mahasiswa	Aktif	2026-03-12 08:58:13.429869	\N	SLTA/Sederajat
1276	417	Azril Syafiq Alfarizki	3277020203180003	\N	Laki-laki	Belum Kawin	Islam	Anak	2018-03-02	Pelajar/Mahasiswa	Aktif	2026-03-12 08:59:13.614805	\N	SLTP/Sederajat
1086	362	SADERAKHI DAELI	3277022809810013	081320011766	Laki-laki	Kawin	Kristen	Kepala Keluarga	1981-09-28	Karyawan Swasta	Aktif	2026-03-10 08:00:25.875127	\N	\N
10	5	Rendi Riswara	3217060608960013	083817981922	Laki-laki	Kawin	Islam	Kepala Keluarga	1996-08-06	Jasa	Aktif	2026-03-08 17:47:13.290755	/uploads/ktp/1773036672676-y7s9cshgm9.jpg	SLTA/Sederajat
14	5	Rizky Syahrul Mubarok	3277021705190004	\N	Laki-laki	Belum Kawin	Islam	Anak	2019-05-17	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.302025	\N	Tidak/Belum Tamat SD
162	46	Warman	3277021707710027	085724494507	Laki-laki	Kawin	Islam	Kepala Keluarga	1971-07-17	Wiraswasta	Aktif	2026-03-08 17:47:13.869901	/uploads/ktp/1773265183617-fvv45xosf0w.jpeg	SLTA/Sederajat
164	46	Insani Nurul Qolbi	3277025601040003	085860068395	Perempuan	Belum Kawin	Islam	Anak	2004-01-16	Pelajar/Mahasiswa	Aktif	2026-03-08 17:47:13.877789	/uploads/ktp/1773264904841-20e2yos22j.jpeg	SLTA/Sederajat
1277	418	Endan Dadan 	3277020810750018	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-10-09	Buruh Harian Lepas	Aktif	2026-03-13 07:15:40.097643	\N	SLTP/Sederajat
1278	419	TANTAN RUSMANA	3277011107770036	08578478084	Laki-laki	Kawin	Islam	Kepala Keluarga	1977-07-11	Wiraswasta	Aktif	2026-03-13 07:17:12.990386	\N	SLTA/Sederajat
1279	418	Yani Nuryani	3277026701820010	\N	Perempuan	Kawin	Islam	Istri	1982-01-27	Mengurus Rumah Tangga	Aktif	2026-03-13 07:17:14.808403	\N	SLTP/Sederajat
1280	419	TITA LAELA SARI	3277024903770009	08996931651	Perempuan	Kawin	Islam	Istri	1977-03-09	Mengurus Rumah Tangga	Aktif	2026-03-13 07:18:56.262177	\N	SLTA/Sederajat
1281	418	Arya Chandra Maulana	3277020104070001	\N	Laki-laki	Belum Kawin	Islam	Anak	2007-04-01	Pelajar/Mahasiswa	Aktif	2026-03-13 07:19:34.928201	\N	SLTA/Sederajat
1282	418	Andrean Habibie Alrasid	3277022411100002	081993422144	Laki-laki	Belum Kawin	Islam	Anak	2010-10-24	Pelajar/Mahasiswa	Aktif	2026-03-13 07:21:20.03893	\N	SLTP/Sederajat
1283	418	Attala Haikal Ramdhani	3277020605210005	\N	Laki-laki	Belum Kawin	Islam	Anak	2021-05-06	Belum/Tidak Bekerja	Aktif	2026-03-13 07:22:29.018228	\N	Tidak/Belum Tamat SD
1284	419	FAUZIYAH NUR HASNA	3277026507010007	08986433664	Perempuan	Belum Kawin	Islam	Anak	2001-07-24	Lainnya	Aktif	2026-03-13 07:23:17.31698	\N	SLTA/Sederajat
1285	419	FAUZAN DWIANSYAH	3277020406080002	083191354720	Laki-laki	Belum Kawin	Islam	Anak	2008-06-04	Pelajar/Mahasiswa	Aktif	2026-03-13 07:24:29.331557	\N	SLTA/Sederajat
1286	420	Hendra Darmawan	3273071310940010	087874521864	Laki-laki	Kawin	Islam	Kepala Keluarga	1994-10-13	Buruh Harian Lepas	Aktif	2026-03-13 07:25:50.562397	\N	SLTA/Sederajat
1287	420	Jihan Fitrilia	3277025304010001	08814595237	Perempuan	Kawin	Islam	Istri	2001-04-13	Ibu Rumah Tangga	Aktif	2026-03-13 07:27:04.650495	\N	SLTA/Sederajat
1288	421	ADJA KAMALUDIN	3277021407530003	081394129505	Laki-laki	Kawin	Islam	Kepala Keluarga	1953-07-14	Wiraswasta	Aktif	2026-03-13 07:27:54.920853	\N	SLTA/Sederajat
1289	420	Alana Faizah Salwa	3277026506240002	\N	Laki-laki	Belum Kawin	Islam	Anak	2024-06-25	Belum/Tidak Bekerja	Aktif	2026-03-13 07:27:56.773917	\N	Belum Sekolah
1290	421	SITI SADIAH	3277026702610006	081395393861	Perempuan	Kawin	Islam	Istri	1961-02-27	Pensiunan	Aktif	2026-03-13 07:29:26.07052	\N	Diploma IV/Strata I
1291	421	EKI AHMAD SATARI	3277022610960006	087823802927	Laki-laki	Belum Kawin	Islam	Anak	1996-10-26	Guru	Aktif	2026-03-13 07:30:38.506986	\N	Diploma IV/Strata I
1292	422	Yeni Suminar	3277025202750016	085624185642	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1975-02-12	Mengurus Rumah Tangga	Aktif	2026-03-13 07:31:44.400936	\N	SLTP/Sederajat
1294	423	ASEP SUTISNA	3277020101590058	082121247372	Laki-laki	Kawin	Islam	Kepala Keluarga	1959-01-01	Buruh Harian Lepas	Aktif	2026-03-13 07:34:01.05763	\N	SLTP/Sederajat
1293	422	Muhamad Junsar	3277021306030006	\N	Laki-laki	Belum Kawin	Islam	Anak	2003-06-13	Belum/Tidak Bekerja	Aktif	2026-03-13 07:33:58.36217	\N	SLTP/Sederajat
1295	423	SUTINAH	3277026404660013	081312832724	Perempuan	Kawin	Islam	Istri	1966-04-24	Mengurus Rumah Tangga	Aktif	2026-03-13 07:35:30.069168	\N	SLTP/Sederajat
1296	422	Nendi Iskandar	3277021805090005	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-05-18	Pelajar/Mahasiswa	Aktif	2026-03-13 07:36:20.375626	\N	Tidak/Belum Tamat SD
1297	423	WINA HERLIANA	3277024601960015	089505059638	Perempuan	Belum Kawin	Islam	Anak	1996-01-06	Guru	Aktif	2026-03-13 07:36:57.320954	\N	Diploma IV/Strata I
1298	424	YONNAFRI DAGUCI	3277020812630003	\N	Laki-laki	Kawin	Islam	Kepala Keluarga	1963-12-08	Wiraswasta	Aktif	2026-03-13 07:43:13.535057	\N	SLTA/Sederajat
1299	424	NURASIAH	3277026604700016	085321863892	Perempuan	Kawin	Islam	Istri	1970-04-15	Ibu Rumah Tangga	Aktif	2026-03-13 07:44:33.240189	\N	SLTP/Sederajat
1300	424	FAISAL MURFID D	3277021306480015	\N	Laki-laki	Belum Kawin	Islam	Anak	1998-06-13	Belum/Tidak Bekerja	Aktif	2026-03-13 07:45:42.537117	\N	SLTA/Sederajat
1301	425	Eli Parlina	3277026212780025	082182450132	Perempuan	Cerai Hidup	Islam	Kepala Keluarga	1978-12-22	Belum/Tidak Bekerja	Aktif	2026-03-13 07:48:34.941171	\N	SLTA/Sederajat
1302	425	Adi Arman Saputra	3277022601030003	\N	Laki-laki	Belum Kawin	Islam	Anak	2003-01-26	Buruh Harian Lepas	Aktif	2026-03-13 07:50:36.44923	\N	SLTA/Sederajat
1303	425	Firly Aiman	3277022406050011	\N	Laki-laki	Belum Kawin	Islam	Anak	2005-06-24	Pelajar/Mahasiswa	Aktif	2026-03-13 07:51:38.468652	\N	SLTA/Sederajat
1304	426	NENENG  IRA HARTATI	3277035602640014	081931341133	Perempuan	Belum Kawin	Islam	Kepala Keluarga	1984-02-16	Mengurus Rumah Tangga	Aktif	2026-03-13 07:53:08.844211	\N	SLTA/Sederajat
1305	426	INTAN NAILA LESTARI	3277035307050001	\N	Perempuan	Belum Kawin	Islam	Anak	2005-07-12	Pelajar/Mahasiswa	Aktif	2026-03-13 07:54:13.228308	\N	SLTA/Sederajat
1306	427	Yadi Suryadi	3277011205740030	083820755809	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1974-05-12	Karyawan Honorer	Aktif	2026-03-13 07:54:46.031026	\N	Akademi/Diploma III
1307	426	PUTRI ZAHRA OKTAVIANI	3277036410110004	\N	Perempuan	Belum Kawin	Islam	Anak	2011-10-24	Pelajar/Mahasiswa	Aktif	2026-03-13 07:55:34.492919	\N	Tamat SD/Sederajat
1308	426	MUHAMMAD RAYYAN MARINO PUTRA	3277022809230001	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-09-28	Belum/Tidak Bekerja	Aktif	2026-03-13 07:56:42.447964	\N	Belum Sekolah
1309	428	Rudi Gunawan Nur	3217083108840002	082217575655	Laki-laki	Kawin	Islam	Kepala Keluarga	1984-08-31	Karyawan Swasta	Aktif	2026-03-13 07:59:05.046211	\N	Akademi/Diploma III
1310	428	Nurwita Widyastuti	3277015106880003	0895707699699	Perempuan	Kawin	Islam	Istri	1988-06-13	Mengurus Rumah Tangga	Aktif	2026-03-13 08:00:15.618905	\N	SLTA/Sederajat
1311	429	HERTA SIMANJUNTAK	3277025503540002	085220281364	Perempuan	Cerai Mati	Kristen	Kepala Keluarga	1954-03-15	Mengurus Rumah Tangga	Aktif	2026-03-13 08:01:16.605603	\N	SLTA/Sederajat
1312	428	Arsyila Romeesa Namuri	3276075712160002	\N	Perempuan	Belum Kawin	Islam	Anak	2016-12-17	Belum/Tidak Bekerja	Aktif	2026-03-13 08:01:38.10265	\N	Belum Sekolah
1313	428	Aneira Nur Lathifa	3277025607230003	\N	Perempuan	Belum Kawin	Islam	Anak	2023-07-16	Mengurus Rumah Tangga	Aktif	2026-03-13 08:02:27.232577	\N	Belum Sekolah
1314	429	JUNITA ROSIDA	3277026706820032	\N	Perempuan	Belum Kawin	Kristen	Anak	1982-06-27	Buruh Harian Lepas	Aktif	2026-03-13 08:02:30.760381	\N	Diploma IV/Strata I
1315	429	MEIKHEL ANDRE BATARA	3277021705920005	\N	Laki-laki	Belum Kawin	Kristen	Anak	1992-05-17	Buruh Harian Lepas	Aktif	2026-03-13 08:03:48.396658	\N	Diploma IV/Strata I
1319	431	Naufal Muhammad Iqbal	3277021606980019	\N	Laki-laki	Belum Kawin	Islam	Anak	1998-06-16	Karyawan Swasta	Aktif	2026-03-13 08:10:36.012532	\N	Diploma IV/Strata I
1320	431	Iqlima Rahma Khairunnisa	3277024904050003	\N	Perempuan	Belum Kawin	Islam	Anak	2005-04-09	Pelajar/Mahasiswa	Aktif	2026-03-13 08:11:48.771996	\N	SLTA/Sederajat
1316	431	Suwito	3277020706630016	\N	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1963-06-07	Pensiunan	Aktif	2026-03-13 08:07:06.803635	\N	Diploma IV/Strata I
1318	431	Ina Maemunah Hartiningsih	3277026705690017	\N	Perempuan	Kawin	Islam	Istri	1969-05-27	Pensiunan	Aktif	2026-03-13 08:09:00.780237	\N	Diploma IV/Strata I
1323	434	Dudy Hartoyo	3277020410730010	085603238404	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-10-04	Pelaut	Aktif	2026-03-13 08:16:09.336975	\N	Diploma I/II
1325	434	Siti Patimah	3205115210960002	085703226321	Perempuan	Kawin	Islam	Istri	1996-10-12	Ibu Rumah Tangga	Aktif	2026-03-13 08:17:24.9136	\N	SLTP/Sederajat
1326	434	Siti Nailah Gavaputri Hartoyo	3277026510190003	\N	Perempuan	Belum Kawin	Islam	Anak	2019-10-25	Belum/Tidak Bekerja	Aktif	2026-03-13 08:19:03.617785	\N	Tidak/Belum Tamat SD
1327	434	Siti Nakhla Assyofa Hartoyo	3277026209230003	\N	Laki-laki	Belum Kawin	Islam	Anak	2023-09-22	Belum/Tidak Bekerja	Aktif	2026-03-13 08:19:50.043579	\N	Belum Sekolah
1328	435	Ridwan Tirtana	3277021204890017	089505416655	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1989-04-12	Karyawan Swasta	Aktif	2026-03-13 08:22:59.051437	\N	SLTA/Sederajat
1329	436	KARMIATI	3277025301530001	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1953-01-13	Ibu Rumah Tangga	Aktif	2026-03-13 08:24:13.110685	\N	SLTA/Sederajat
1330	437	Roni Hambali	3277031411790002	081320628059	Laki-laki	Cerai Hidup	Islam	Kepala Keluarga	1979-11-14	Karyawan Swasta	Aktif	2026-03-13 08:26:33.989766	\N	SLTA/Sederajat
1331	438	Rosid Kurnia	3277020806810012	081211626523	Laki-laki	Belum Kawin	Islam	Kepala Keluarga	1981-06-08	Buruh Harian Lepas	Aktif	2026-03-13 08:27:18.874003	/uploads/ktp/1773390439209-0low6jze603.pdf	Tamat SD/Sederajat
1332	433	JAJANG SUHERMAN	3277022512680019	0895338326492	Laki-laki	Kawin	Islam	Kepala Keluarga	1968-12-25	Karyawan Swasta	Aktif	2026-03-13 08:28:02.165251	\N	SLTA/Sederajat
1333	440	Tatang Suhendar	3277020104730001	089527111865	Laki-laki	Kawin	Islam	Kepala Keluarga	1973-04-01	Buruh Harian Lepas	Aktif	2026-03-13 08:29:27.988888	\N	SLTP/Sederajat
1334	433	ELIS ROHMAWATI	3277024809770001	0895338326494	Perempuan	Kawin	Islam	Istri	1977-09-08	Mengurus Rumah Tangga	Aktif	2026-03-13 08:29:51.506283	\N	SLTP/Sederajat
1335	433	FAJAR JAIS HERMANDA	3277021405980017	085704222879	Laki-laki	Belum Kawin	Islam	Anak	1998-05-14	Kepolisian RI (POLRI)	Aktif	2026-03-13 08:31:02.980304	\N	SLTP/Sederajat
1336	440	Evi  Soviantini	3277024204860001	\N	Perempuan	Kawin	Islam	Anak	1986-04-02	Mengurus Rumah Tangga	Aktif	2026-03-13 08:31:09.628712	\N	SLTA/Sederajat
1337	440	Fardan Sovian Yusuf	32770227050900001	\N	Laki-laki	Belum Kawin	Islam	Anak	2009-05-27	Pelajar/Mahasiswa	Aktif	2026-03-13 08:32:27.985249	\N	Tamat SD/Sederajat
1338	433	FAISAL AZHAR HERMANDA	3277020312090001	0895338326502	Laki-laki	Belum Kawin	Islam	Anak	2009-12-03	Pelajar/Mahasiswa	Aktif	2026-03-13 08:32:41.655298	\N	SLTP/Sederajat
1339	440	Khaira Putri Khalifah	3277026211160002	\N	Laki-laki	Belum Kawin	Islam	Anak	2016-11-22	Pelajar/Mahasiswa	Aktif	2026-03-13 08:33:47.821186	\N	Tidak/Belum Tamat SD
1341	441	LILIS NURLIANI	3277024702700017	085134893170	Perempuan	Kawin	Islam	Istri	1970-02-07	Ibu Rumah Tangga	Aktif	2026-03-13 08:36:11.452718	\N	SLTA/Sederajat
1342	441	RAFI NURDIANSYAH	3277021007050002	0895708256555	Laki-laki	Belum Kawin	Islam	Anak	2005-07-10	Pelajar/Mahasiswa	Aktif	2026-03-13 08:37:47.557989	\N	SLTA/Sederajat
1343	443	Yadi Mulyadi	3277021503770022	089763716647	Laki-laki	Belum Kawin	Islam	Anak	1977-03-15	Buruh Harian Lepas	Aktif	2026-03-13 08:39:26.988816	\N	Tamat SD/Sederajat
1344	443	Entin Supartini	3277025105540001	\N	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1954-05-11	Mengurus Rumah Tangga	Meninggal	2026-03-13 08:40:32.962854	\N	Tamat SD/Sederajat
1345	443	Dani Ruswandi	3277021605880009	08522860689	Laki-laki	Belum Kawin	Islam	Anak	1988-05-16	Buruh Harian Lepas	Aktif	2026-03-13 08:41:37.077449	\N	SLTP/Sederajat
1346	444	Yuyun ayulianti	3277026007900001	089673320044	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1988-07-27	Mengurus Rumah Tangga	Aktif	2026-03-13 08:44:39.48956	\N	SLTA/Sederajat
1347	445	ANI MULYANI	3277026001750001	0895378241454	Perempuan	Cerai Mati	Islam	Kepala Keluarga	1975-05-07	Ibu Rumah Tangga	Aktif	2026-03-13 08:48:00.8827	\N	Tamat SD/Sederajat
1348	445	IRHAS MALIK KUSUMAH	3277020502000009	089517318513	Laki-laki	Belum Kawin	Islam	Anak	2020-02-05	Belum/Tidak Bekerja	Aktif	2026-03-13 08:49:08.299501	\N	SLTA/Sederajat
1349	445	ALPI HADIANSAH	3277020704020013	0895378241426	Laki-laki	Belum Kawin	Islam	Anak	2002-04-07	\N	Aktif	2026-03-13 08:50:57.249747	\N	SLTA/Sederajat
1350	445	AMAR IJRA WIGUNA	3277020412060006	089529435913	Laki-laki	Belum Kawin	Islam	Anak	2006-12-04	\N	Aktif	2026-03-13 08:52:02.410992	\N	SLTA/Sederajat
1351	445	RAIHAN AHMAD HANAPI	3277022509140004	\N	Laki-laki	Belum Kawin	Islam	Anak	2014-09-25	Pelajar/Mahasiswa	Aktif	2026-03-13 08:53:02.05088	\N	Tidak/Belum Tamat SD
1352	444	Aldhila Irgi Pratiwi	3277024605110002	\N	Perempuan	Belum Kawin	Islam	Anak	2011-05-06	Pelajar/Mahasiswa	Aktif	2026-03-13 08:58:44.21948	\N	SLTP/Sederajat
1353	444	Nuri Oktaviani Putri	3277026310130002	\N	Perempuan	Belum Kawin	Islam	Anak	2013-10-23	Pelajar/Mahasiswa	Aktif	2026-03-13 09:00:12.376768	\N	Tidak/Belum Tamat SD
1354	444	Muhammad Raid Syazani	32770210052200003	\N	Laki-laki	Belum Kawin	Islam	Anak	2022-05-10	Belum/Tidak Bekerja	Aktif	2026-03-13 09:01:17.199405	\N	Belum Sekolah
1340	441	DIDIN ROSIDIN	3277021106750024	3277021106750024	Laki-laki	Kawin	Islam	Kepala Keluarga	1976-06-11	Karyawan Swasta	Aktif	2026-03-13 08:34:58.648833	\N	SLTP/Sederajat
765	240	Muchammad Hudri	3277021807750021	081905279136	Laki-laki	Kawin	Islam	Kepala Keluarga	1975-07-18	Karyawan Swasta	Aktif	2026-03-08 17:47:15.987815	\N	\N
583	185	Enung Eni	3277027001610006	088224509802	Perempuan	Kawin	Islam	Istri	1961-01-30	Pensiunan	Aktif	2026-03-08 17:47:15.344643	\N	SLTA/Sederajat
1023	344	CATHLEEN ALICE	3277024512150004	081717170911	Perempuan	Belum Kawin	Katolik	Anak	2015-12-05	Pelajar/Mahasiswa	Aktif	2026-03-09 08:33:14.864598	\N	Tidak/Belum Tamat SD
\.


--
-- Data for Name: warga_singgah; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warga_singgah (id, pemilik_kost_id, nama_lengkap, nik, nomor_whatsapp, pekerjaan, tanggal_mulai_kontrak, tanggal_habis_kontrak, jumlah_penghuni, keperluan_tinggal, status, created_at) FROM stdin;
\.


--
-- Name: admin_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_user_id_seq', 37, true);


--
-- Name: donasi_campaign_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donasi_campaign_id_seq', 4, true);


--
-- Name: donasi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donasi_id_seq', 1, true);


--
-- Name: izin_tetangga_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.izin_tetangga_id_seq', 1, false);


--
-- Name: kartu_keluarga_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kartu_keluarga_id_seq', 445, true);


--
-- Name: karyawan_usaha_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.karyawan_usaha_id_seq', 1, false);


--
-- Name: kas_rw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kas_rw_id_seq', 8, true);


--
-- Name: laporan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.laporan_id_seq', 4, true);


--
-- Name: monthly_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.monthly_snapshot_id_seq', 1, true);


--
-- Name: pemilik_kost_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pemilik_kost_id_seq', 1, false);


--
-- Name: pengajuan_bansos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pengajuan_bansos_id_seq', 1, true);


--
-- Name: profile_edit_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.profile_edit_request_id_seq', 10, true);


--
-- Name: riwayat_kontrak_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.riwayat_kontrak_id_seq', 1, false);


--
-- Name: riwayat_stiker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.riwayat_stiker_id_seq', 1, false);


--
-- Name: rt_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rt_data_id_seq', 7, true);


--
-- Name: surat_rw_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.surat_rw_id_seq', 3, true);


--
-- Name: surat_warga_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.surat_warga_id_seq', 42, true);


--
-- Name: survey_usaha_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.survey_usaha_id_seq', 1, false);


--
-- Name: usaha_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usaha_id_seq', 1, false);


--
-- Name: wa_blast_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wa_blast_id_seq', 10, true);


--
-- Name: warga_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warga_id_seq', 1354, true);


--
-- Name: warga_singgah_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warga_singgah_id_seq', 1, false);


--
-- Name: admin_user admin_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_user
    ADD CONSTRAINT admin_user_pkey PRIMARY KEY (id);


--
-- Name: admin_user admin_user_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_user
    ADD CONSTRAINT admin_user_username_unique UNIQUE (username);


--
-- Name: donasi_campaign donasi_campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi_campaign
    ADD CONSTRAINT donasi_campaign_pkey PRIMARY KEY (id);


--
-- Name: donasi donasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi
    ADD CONSTRAINT donasi_pkey PRIMARY KEY (id);


--
-- Name: izin_tetangga izin_tetangga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.izin_tetangga
    ADD CONSTRAINT izin_tetangga_pkey PRIMARY KEY (id);


--
-- Name: kartu_keluarga kartu_keluarga_nomor_kk_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kartu_keluarga
    ADD CONSTRAINT kartu_keluarga_nomor_kk_unique UNIQUE (nomor_kk);


--
-- Name: kartu_keluarga kartu_keluarga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kartu_keluarga
    ADD CONSTRAINT kartu_keluarga_pkey PRIMARY KEY (id);


--
-- Name: karyawan_usaha karyawan_usaha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan_usaha
    ADD CONSTRAINT karyawan_usaha_pkey PRIMARY KEY (id);


--
-- Name: kas_rw kas_rw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kas_rw
    ADD CONSTRAINT kas_rw_pkey PRIMARY KEY (id);


--
-- Name: laporan laporan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_pkey PRIMARY KEY (id);


--
-- Name: monthly_snapshot monthly_snapshot_month_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_snapshot
    ADD CONSTRAINT monthly_snapshot_month_unique UNIQUE (month);


--
-- Name: monthly_snapshot monthly_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_snapshot
    ADD CONSTRAINT monthly_snapshot_pkey PRIMARY KEY (id);


--
-- Name: pemilik_kost pemilik_kost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pemilik_kost
    ADD CONSTRAINT pemilik_kost_pkey PRIMARY KEY (id);


--
-- Name: pengajuan_bansos pengajuan_bansos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan_bansos
    ADD CONSTRAINT pengajuan_bansos_pkey PRIMARY KEY (id);


--
-- Name: profile_edit_request profile_edit_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_edit_request
    ADD CONSTRAINT profile_edit_request_pkey PRIMARY KEY (id);


--
-- Name: riwayat_kontrak riwayat_kontrak_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kontrak
    ADD CONSTRAINT riwayat_kontrak_pkey PRIMARY KEY (id);


--
-- Name: riwayat_stiker riwayat_stiker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_stiker
    ADD CONSTRAINT riwayat_stiker_pkey PRIMARY KEY (id);


--
-- Name: rt_data rt_data_nomor_rt_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rt_data
    ADD CONSTRAINT rt_data_nomor_rt_unique UNIQUE (nomor_rt);


--
-- Name: rt_data rt_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rt_data
    ADD CONSTRAINT rt_data_pkey PRIMARY KEY (id);


--
-- Name: surat_rw surat_rw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_rw
    ADD CONSTRAINT surat_rw_pkey PRIMARY KEY (id);


--
-- Name: surat_warga surat_warga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_warga
    ADD CONSTRAINT surat_warga_pkey PRIMARY KEY (id);


--
-- Name: survey_usaha survey_usaha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_usaha
    ADD CONSTRAINT survey_usaha_pkey PRIMARY KEY (id);


--
-- Name: usaha usaha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usaha
    ADD CONSTRAINT usaha_pkey PRIMARY KEY (id);


--
-- Name: wa_blast wa_blast_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wa_blast
    ADD CONSTRAINT wa_blast_pkey PRIMARY KEY (id);


--
-- Name: warga warga_nik_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga
    ADD CONSTRAINT warga_nik_unique UNIQUE (nik);


--
-- Name: warga warga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga
    ADD CONSTRAINT warga_pkey PRIMARY KEY (id);


--
-- Name: warga_singgah warga_singgah_nik_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga_singgah
    ADD CONSTRAINT warga_singgah_nik_unique UNIQUE (nik);


--
-- Name: warga_singgah warga_singgah_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga_singgah
    ADD CONSTRAINT warga_singgah_pkey PRIMARY KEY (id);


--
-- Name: donasi donasi_campaign_id_donasi_campaign_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi
    ADD CONSTRAINT donasi_campaign_id_donasi_campaign_id_fk FOREIGN KEY (campaign_id) REFERENCES public.donasi_campaign(id);


--
-- Name: donasi donasi_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donasi
    ADD CONSTRAINT donasi_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: izin_tetangga izin_tetangga_usaha_id_usaha_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.izin_tetangga
    ADD CONSTRAINT izin_tetangga_usaha_id_usaha_id_fk FOREIGN KEY (usaha_id) REFERENCES public.usaha(id);


--
-- Name: karyawan_usaha karyawan_usaha_usaha_id_usaha_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.karyawan_usaha
    ADD CONSTRAINT karyawan_usaha_usaha_id_usaha_id_fk FOREIGN KEY (usaha_id) REFERENCES public.usaha(id);


--
-- Name: kas_rw kas_rw_campaign_id_donasi_campaign_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kas_rw
    ADD CONSTRAINT kas_rw_campaign_id_donasi_campaign_id_fk FOREIGN KEY (campaign_id) REFERENCES public.donasi_campaign(id);


--
-- Name: laporan laporan_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: laporan laporan_warga_id_warga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laporan
    ADD CONSTRAINT laporan_warga_id_warga_id_fk FOREIGN KEY (warga_id) REFERENCES public.warga(id);


--
-- Name: pengajuan_bansos pengajuan_bansos_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan_bansos
    ADD CONSTRAINT pengajuan_bansos_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: profile_edit_request profile_edit_request_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_edit_request
    ADD CONSTRAINT profile_edit_request_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: profile_edit_request profile_edit_request_warga_id_warga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_edit_request
    ADD CONSTRAINT profile_edit_request_warga_id_warga_id_fk FOREIGN KEY (warga_id) REFERENCES public.warga(id);


--
-- Name: riwayat_kontrak riwayat_kontrak_warga_singgah_id_warga_singgah_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_kontrak
    ADD CONSTRAINT riwayat_kontrak_warga_singgah_id_warga_singgah_id_fk FOREIGN KEY (warga_singgah_id) REFERENCES public.warga_singgah(id);


--
-- Name: riwayat_stiker riwayat_stiker_usaha_id_usaha_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_stiker
    ADD CONSTRAINT riwayat_stiker_usaha_id_usaha_id_fk FOREIGN KEY (usaha_id) REFERENCES public.usaha(id);


--
-- Name: surat_warga surat_warga_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_warga
    ADD CONSTRAINT surat_warga_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: surat_warga surat_warga_warga_id_warga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surat_warga
    ADD CONSTRAINT surat_warga_warga_id_warga_id_fk FOREIGN KEY (warga_id) REFERENCES public.warga(id);


--
-- Name: survey_usaha survey_usaha_usaha_id_usaha_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_usaha
    ADD CONSTRAINT survey_usaha_usaha_id_usaha_id_fk FOREIGN KEY (usaha_id) REFERENCES public.usaha(id);


--
-- Name: warga warga_kk_id_kartu_keluarga_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga
    ADD CONSTRAINT warga_kk_id_kartu_keluarga_id_fk FOREIGN KEY (kk_id) REFERENCES public.kartu_keluarga(id);


--
-- Name: warga_singgah warga_singgah_pemilik_kost_id_pemilik_kost_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warga_singgah
    ADD CONSTRAINT warga_singgah_pemilik_kost_id_pemilik_kost_id_fk FOREIGN KEY (pemilik_kost_id) REFERENCES public.pemilik_kost(id);


--
-- PostgreSQL database dump complete
--

\unrestrict KTVLRwU9RnOFDGGRm0Jx0zKHBsnFfPUL71SaP9li4h6a1aXeMndVH9G9tXSw1D4

