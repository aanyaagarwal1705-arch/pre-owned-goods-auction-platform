-- Sample / Seed Data

USE preowned_auction_db;

-- 1. USERS

INSERT INTO users
(name, email, password, phone, role)
VALUES
('Aanya Agarwal', 'aanya@example.com', 'demo_hash_1', '9876543210', 'seller'),
('Rahul Sharma', 'rahul@example.com', 'demo_hash_2', '9876543211', 'buyer'),
('Priya Verma', 'priya@example.com', 'demo_hash_3', '9876543212', 'buyer'),
('Arjun Mehta', 'arjun@example.com', 'demo_hash_4', '9876543213', 'seller'),
('Neha Singh', 'neha@example.com', 'demo_hash_5', '9876543214', 'buyer'),
('Admin User', 'admin@example.com', 'demo_hash_6', '9876543215', 'admin');


-- 2. CATEGORIES

INSERT INTO categories
(category_name)
VALUES
('Electronics'),
('Books'),
('Furniture'),
('Fashion'),
('Sports');


-- 3. PRODUCTS

INSERT INTO products
(seller_id, category_id, name, description, `condition`)
VALUES
(1, 1,'Dell Inspiron Laptop','Used laptop suitable for students and everyday work.','Good'),
(1, 2,'Engineering Mathematics Books','Collection of engineering mathematics textbooks.','Good'),
(4, 1,'Canon DSLR Camera','Pre-owned DSLR camera with lens.','Excellent'),
(4, 3,'Study Table','Wooden study table suitable for a home or hostel room.','Fair'),
(1, 5,'Badminton Racket','Pre-owned badminton racket in usable condition.','Good');

-- 4. AUCTIONS

INSERT INTO auctions
(product_id, starting_price, min_bid_increment,start_time, end_time, status)
VALUES
(1, 25000.00, 500.00,'2026-10-01 10:00:00','2026-10-10 20:00:00','active'),
(2, 800.00, 50.00,'2026-10-01 09:00:00','2026-10-08 20:00:00','active'),
(3, 30000.00, 1000.00,'2026-09-20 10:00:00','2026-09-30 20:00:00','ended'),
(4, 1500.00, 100.00,'2026-10-02 10:00:00','2026-10-12 20:00:00','active');


-- 5. BIDS

INSERT INTO bids
(auction_id, buyer_id, bid_amount, bid_time)
VALUES
(1, 2, 25000.00, '2026-10-01 11:00:00'),
(1, 3, 25500.00, '2026-10-02 12:30:00'),
(1, 5, 26000.00, '2026-10-03 15:45:00'),
(2, 2, 800.00, '2026-10-01 12:00:00'),
(2, 3, 850.00, '2026-10-02 14:00:00'),
(3, 2, 30000.00, '2026-09-21 11:00:00'),
(3, 5, 31000.00, '2026-09-22 13:00:00'),
(3, 3, 32000.00, '2026-09-25 16:00:00'),
(4, 5, 1500.00, '2026-10-03 10:30:00');


-- 6. WINNER FOR COMPLETED AUCTION

UPDATE auctions
SET winner_id = 3
WHERE auction_id = 3;

-- 7. PAYMENTS

INSERT INTO payments
(auction_id, buyer_id, amount, payment_status, payment_date)
VALUES
(3, 3, 32000.00, 'paid', '2026-09-26 12:00:00');

-- 8. REVIEWS

INSERT INTO reviews
(auction_id, rating, comment)
VALUES
(3, 5, 'The product was exactly as described and the transaction was smooth.');

-- SEED DATA COMPLETE
