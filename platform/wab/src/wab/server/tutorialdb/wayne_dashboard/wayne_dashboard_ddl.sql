--
-- publicQL database dump
--

-- Dumped from database version 15.1 (Ubuntu 15.1-1.pgdg20.04+1)
-- Dumped by pg_dump version 15.3
--
-- Statements manually removed to strip unnecessary data (auth. and supabase handling)

begin;

drop type if exists order_status cascade;
drop sequence if exists categories_category_id_seq cascade;
drop sequence if exists inventorylog_logid_seq cascade;
drop sequence if exists orderdetails_order_detail_id_seq cascade;
drop sequence if exists orders_order_id_seq cascade;
drop sequence if exists products_product_id_seq cascade;
drop sequence if exists users_user_id_seq cascade;
drop table if exists categories cascade;
drop table if exists inventorylog cascade;
drop table if exists orderdetails cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists users cascade;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: public
--

CREATE TYPE order_status AS ENUM (
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Canceled'
);

--
-- Name: categories; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE categories (
    category_id integer NOT NULL,
    name character varying(100),
    description text
);

--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE categories_category_id_seq OWNED BY categories.category_id;


--
-- Name: inventorylog; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE inventorylog (
    logid integer NOT NULL,
    productid integer,
    action text,
    quantity integer,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventorylog_action_check CHECK ((action = ANY (ARRAY['Added'::text, 'Removed'::text, 'Updated'::text])))
);

--
-- Name: inventorylog_logid_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE inventorylog_logid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: inventorylog_logid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE inventorylog_logid_seq OWNED BY inventorylog.logid;


--
-- Name: orderdetails; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE orderdetails (
    order_detail_id integer NOT NULL,
    order_id integer,
    product_id integer,
    quantity integer,
    price numeric(10,2)
);

--
-- Name: orderdetails_order_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE orderdetails_order_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: orderdetails_order_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE orderdetails_order_detail_id_seq OWNED BY orderdetails.order_detail_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE orders (
    order_id integer NOT NULL,
    user_id integer,
    order_date timestamp with time zone,
    status order_status DEFAULT 'Pending'::order_status,
    total_price numeric(10,2),
    shipping_cost numeric(10,2),
    tax_amount numeric(10,2),
    tracking_number character varying(50),
    is_paid boolean DEFAULT false,
    paid_at timestamp with time zone,
    is_shipped boolean DEFAULT false,
    shipped_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE orders_order_id_seq OWNED BY orders.order_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE products (
    product_id integer NOT NULL,
    name character varying(100),
    description text,
    price numeric(10,2),
    stock_quantity integer,
    sku character varying(50),
    brand character varying(50),
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    category_id integer,
    low_stock_threshold integer
);

--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE products_product_id_seq OWNED BY products.product_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: public
--

CREATE TABLE users (
    user_id integer NOT NULL,
    username character varying(50),
    email character varying(50),
    password character varying(50),
    country character varying(50),
    signup_date timestamp with time zone,
    first_name character varying(50),
    last_name character varying(50)
);

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: public
--

CREATE SEQUENCE users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: public
--

ALTER SEQUENCE users_user_id_seq OWNED BY users.user_id;


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY categories ALTER COLUMN category_id SET DEFAULT nextval('categories_category_id_seq'::regclass);


--
-- Name: inventorylog logid; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY inventorylog ALTER COLUMN logid SET DEFAULT nextval('inventorylog_logid_seq'::regclass);


--
-- Name: orderdetails order_detail_id; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY orderdetails ALTER COLUMN order_detail_id SET DEFAULT nextval('orderdetails_order_detail_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY orders ALTER COLUMN order_id SET DEFAULT nextval('orders_order_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY products ALTER COLUMN product_id SET DEFAULT nextval('products_product_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: public
--

ALTER TABLE ONLY users ALTER COLUMN user_id SET DEFAULT nextval('users_user_id_seq'::regclass);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: inventorylog inventorylog_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY inventorylog
    ADD CONSTRAINT inventorylog_pkey PRIMARY KEY (logid);


--
-- Name: orderdetails orderdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY orderdetails
    ADD CONSTRAINT orderdetails_pkey PRIMARY KEY (order_detail_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: inventorylog inventorylog_productid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY inventorylog
    ADD CONSTRAINT inventorylog_productid_fkey FOREIGN KEY (productid) REFERENCES products(product_id) ON DELETE CASCADE;


--
-- Name: orderdetails orderdetails_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY orderdetails
    ADD CONSTRAINT orderdetails_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: public
--

ALTER TABLE ONLY products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE;

commit;