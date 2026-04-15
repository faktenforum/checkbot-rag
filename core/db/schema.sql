\restrict dbmate

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3

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
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chunks (
    id integer NOT NULL,
    claim_id uuid NOT NULL,
    chunk_type text NOT NULL,
    fact_index integer,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    embedding public.vector(1536),
    CONSTRAINT chunks_chunk_type_check CHECK ((chunk_type = ANY (ARRAY['claim_overview'::text, 'fact_detail'::text])))
);


--
-- Name: chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chunks_id_seq OWNED BY public.chunks.id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id uuid NOT NULL,
    short_id text,
    process_id integer,
    status text DEFAULT 'imported'::text NOT NULL,
    synopsis text,
    rating_statement text,
    rating_summary text,
    rating_label text,
    categories text[] DEFAULT '{}'::text[],
    publishing_url text,
    publishing_date timestamp with time zone,
    internal boolean DEFAULT false,
    version_hash text NOT NULL,
    raw_data jsonb NOT NULL,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    language text
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source text NOT NULL,
    total integer DEFAULT 0,
    processed integer DEFAULT 0,
    skipped integer DEFAULT 0,
    errors integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    canceled_at timestamp with time zone,
    language text
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: chunks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chunks ALTER COLUMN id SET DEFAULT nextval('public.chunks_id_seq'::regclass);


--
-- Name: chunks chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chunks
    ADD CONSTRAINT chunks_pkey PRIMARY KEY (id);


--
-- Name: claims claims_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_external_id_key UNIQUE (external_id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: claims claims_short_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_short_id_key UNIQUE (short_id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: chunks_chunk_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chunks_chunk_type_idx ON public.chunks USING btree (chunk_type);


--
-- Name: chunks_claim_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chunks_claim_id_idx ON public.chunks USING btree (claim_id);


--
-- Name: chunks_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chunks_embedding_idx ON public.chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: chunks_metadata_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chunks_metadata_idx ON public.chunks USING gin (metadata);


--
-- Name: claims_categories_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_categories_idx ON public.claims USING gin (categories);


--
-- Name: claims_language_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_language_idx ON public.claims USING btree (language);


--
-- Name: claims_publishing_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_publishing_date_idx ON public.claims USING btree (publishing_date);


--
-- Name: claims_rating_label_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_rating_label_idx ON public.claims USING btree (rating_label);


--
-- Name: claims_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX claims_status_idx ON public.claims USING btree (status);


--
-- Name: import_jobs_language_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX import_jobs_language_idx ON public.import_jobs USING btree (language);


--
-- Name: import_jobs_status_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX import_jobs_status_created_idx ON public.import_jobs USING btree (status, created_at);


--
-- Name: chunks chunks_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chunks
    ADD CONSTRAINT chunks_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260225120000'),
    ('20260225121000'),
    ('20260225122000'),
    ('20260225123000'),
    ('20260226120000'),
    ('20260226130000');
