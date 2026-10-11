-- Create database
CREATE DATABASE IF NOT EXISTS preowned_auction_db;

USE preowned_auction_db;


-- 1. USERS

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role ENUM('buyer', 'seller', 'admin')
         NOT NULL DEFAULT 'buyer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. CATEGORIES

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);


-- 3. PRODUCTS

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    `condition` ENUM('Excellent', 'Good', 'Fair') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- 4. AUCTIONS

CREATE TABLE auctions (
    auction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    starting_price DECIMAL(10,2) NOT NULL,
    min_bid_increment DECIMAL(10,2) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled', 'active', 'ended')
           NOT NULL DEFAULT 'scheduled',
    winner_id INT NULL,
    CONSTRAINT chk_starting_price
        CHECK (starting_price > 0),
    CONSTRAINT chk_min_bid_increment
        CHECK (min_bid_increment > 0),
    CONSTRAINT chk_auction_dates
        CHECK (end_time > start_time),
    CONSTRAINT fk_auction_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_auction_winner
        FOREIGN KEY (winner_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- 5. BIDS

CREATE TABLE bids (
    bid_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    buyer_id INT NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL,
    bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bid_amount
        CHECK (bid_amount > 0),
    CONSTRAINT fk_bid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_bid_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- 6. PAYMENTS

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE,
    buyer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed')
                    NOT NULL DEFAULT 'pending',
    payment_date DATETIME NULL,
    CONSTRAINT chk_payment_amount
        CHECK (amount > 0),
    CONSTRAINT fk_payment_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_payment_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- 7. REVIEWS

CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating
        CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_review_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


-- DATABASE SCHEMA COMPLETE
