
export interface ReviewResponse {
    status:   Status;
    response: Response;
}

export interface Response {
    review: Review;
}

export interface Review {
    account:         Account;
    id:              number;
    content:         string;
    title:           string;
    score:           number;
    sentiment:       number;
    user_type:       string;
    users:           any[];
    votes_up:        number;
    votes_down:      number;
    user_vote:       number;
    created_at:      Date;
    deleted:         boolean;
    new:             boolean;
    verified_buyer:  boolean;
    archived:        boolean;
    social_pushed:   boolean;
    facebook_pushed: number;
    twitter_pushed:  number;
    products:        ProductElement[];
    user:            User;
    products_apps:   ProductsApp[];
}

export interface Account {
    id:     number;
    domain: string;
}

export interface ProductElement {
    Location_idx: number[];
    Product:      Product;
}

export interface Product {
    id:                                     number;
    name:                                   string;
    slug:                                   string;
    product_url:                            string;
    shorten_url:                            string;
    images:                                 Image[];
    social_network_links:                   SocialNetworkLinks;
    facebook_testemonials_page_product_url: string;
}

export interface Image {
    id:            number;
    image_url:     string;
    big_image_url: string;
}

export interface SocialNetworkLinks {
    linkedin:      string;
    facebook:      string;
    twitter:       string;
    google_oauth2: string;
}

export interface ProductsApp {
    id:          number;
    product_url: string;
    domain_key:  string;
    product:     ProductsAppProduct;
}

export interface ProductsAppProduct {
    id:   number;
    name: string;
}

export interface User {
    id:                  number;
    display_name:        string;
    slug:                string;
    is_social_connected: boolean;
    score:               number;
    badges:              any[];
}

export interface Status {
    code:    number;
    message: string;
}
