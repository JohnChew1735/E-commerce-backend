CREATE TABLE seller_login(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,  
    username VARCHAR(255) UNIQUE NOT NULL,  
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE customer_login(
    id INTEGER PRIMARY KEY AUTO_INCREMENT, 
    username VARCHAR(255) UNIQUE NOT NULL,  
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    coins INTEGER,
   profileImage VARCHAR (255) NOT NULL DEFAULT 'https://www.shutterstock.com/image-vector/default-avatar-profile-icon-social-600nw-1677509740.jpg'

);

//sample login for customer created
username: mom, password: mom

//sample login for seller created
username: test, password: test

CREATE TABLE category (
    categoryID INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE brand (
    brandID INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE all_items (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,  
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    clicked INTEGER DEFAULT 0 CHECK (clicked >= 0),
    categoryID INTEGER,
    brandID INTEGER,
    description TEXT,
    images VARCHAR(2083),
    sellerID INTEGER,
    stockCount INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (sellerID) REFERENCES id(seller_login),
    FOREIGN KEY (categoryID) REFERENCES category(categoryID),
    FOREIGN KEY (brandID) REFERENCES brand(brandID),
    
);

CREATE TABLE stockFlow(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    item_id INTEGER,
    amount INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    inOrOut ENUM ('In', 'Out'),
    sellerID INTEGER,
    customerID INTEGER,
    FOREIGN KEY (item_id) REFERENCES all_items(id),
    FOREIGN KEY (sellerID) REFERENCES seller_login(id),
    FOREIGN KEY (customerID) REFERENCES customer_login(id)
);

CREATE TABLE customerFeedback(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    item_id INTEGER,
    customer_id INTEGER,
    customer_feedback TEXT,
    FOREIGN KEY (item_id) REFERENCES all_items(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customer_login(id) ON DELETE CASCADE
);

CREATE TABLE wishlist(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    item_id INTEGER,
    customer_id INTEGER,
    quantity INTEGER DEFAULT 1,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'added to cart') DEFAULT 'active',
    FOREIGN KEY (item_id) REFERENCES all_items(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customer_login(id) ON DELETE CASCADE
);


//inserting data for initial stock count of inventories into stockFlow table
INSERT INTO stockFlow (item_id, amount, inOrOut, sellerID)
VALUES 
(1, 100, 'In', 2),
(2, 100, 'In', 2),
(3, 100, 'In', 2),
(4, 100, 'In', 2),
(5, 100, 'In', 2),
(6, 100, 'In', 2),
(7, 100, 'In', 2),
(8, 100, 'In', 2),
(9, 100, 'In', 2),
(10, 100, 'In', 2),
(11, 100, 'In', 2),
(12, 100, 'In', 2),
(13, 100, 'In', 2),
(14, 100, 'In', 2),
(15, 100, 'In', 2),
(16, 100, 'In', 2),
(17, 100, 'In', 2),
(18, 100, 'In', 2),
(19, 100, 'In', 2),
(20, 100, 'In', 2),
(21, 100, 'In', 2),
(22, 100, 'In', 2),
(23, 100, 'In', 1);


CREATE TABLE customer_orders (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    customer_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount_from_coins INTEGER,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'abandoned') DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating ENUM('Pending', 'Completed') DEFAULT 'pending',
    user_rating DECIMAL(3,1) CHECK (user_rating BETWEEN 1.0 AND 5.0), 
    read_by_seller ENUM('Yes', 'No'),
    request_for_refund ENUM('Yes, pending approval', 'No', 'Approved', 'Denied'),
    refund_reason VARCHAR(255),
    refund_image VARCHAR(255),
    payment_intent_id VARCHAR(255),
    payment_intent_client_secret VARCHAR(255),
    FOREIGN KEY (customer_id) REFERENCES customer_login(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES all_items(id)
);



//inserting some data into the table category
INSERT INTO category (name)
VALUES 
    ('Electronics'),
    ('Fashion & Apparel'),
    ('Home & Living'),
    ('Beauty & Personal Care'),
    ('Health & Wellness'),
    ('Sports & Outdoor'),
    ('Books & Stationery'),
    ('Toys & Games'),
    ('Automotive & Tools'),
    ('Groceries & Food'),
    ('Pet Supplies'),
    ('Jewelry & Watches');

//inserting some data into the table brands
INSERT INTO brand (name)
VALUES 
    ('Apple'),
    ('Nike'),
    ('IKEA'),
    ('L’Oréal'),
    ('GNC'),
    ('Decathlon'),
    ('Penguin Books'),
    ('Lego'),
    ('Bosch'),
    ('Nestlé'),
    ('Royal Canin'),
    ('Rolex');



//inserting some data into table all_items
INSERT INTO all_items (name, price, clicked, categoryID, brandID, description, images) VALUES
('iPhone 15 Pro Max', 5999, 0, 1, 1, '🔥 The Ultimate Smartphone Experience 🔥\n📱 Features:\n✅ 6.7-inch Super Retina XDR Display\n✅ A17 Pro Chip for Lightning-Fast Performance\n✅ 48MP Pro Camera System\n✅ 5G Connectivity & All-Day Battery Life', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRu_UvBdLGLTOo1IlDrZCALl4fFR7_hgrnX-w&s', 'https://media.wired.com/photos/6508e654501236bad4a1bd84/191:100/w_1280,c_limit/iPhone-15-Pro-Review-Featured-Gear.jpg', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5i_e-tDSrMJR64My7I85owHuIylNd2eQ7QA&s')),
('MacBook Air M2', 4599, 0, 1, 1, '🚀 Sleek & Powerful Laptop 🚀\n💻 Features:\n✅ M2 Chip for Next-Level Performance\n✅ 13.6-inch Liquid Retina Display\n✅ 16GB RAM & 512GB SSD\n✅ Ultra-Lightweight & Up to 18 Hours Battery Life', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP-fjqRrNWM-qTYPFUVERS0u30Hg_lNYpQtg&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSb5Od8MdSJdyhe3bQTZlItnT0A6BMpj7OmUg&s', 'https://image-cdn.hypb.st/https%3A%2F%2Fhypebeast.com%2Fwp-content%2Fblogs.dir%2F6%2Ffiles%2F2022%2F06%2Fapple-macbook-air-pro-m2-chip-wwdc-event-updates-announcement-info-1.jpg?q=75&w=800&cbr=1&fit=max')),
('Apple Watch Series 9', 1999, 0, 1, 1, '⌚ Smart Fitness & Health Tracker ⌚\n🏃‍♂️ Features:\n✅ Advanced Health Monitoring (ECG, Blood Oxygen)\n✅ GPS & Always-On Retina Display\n✅ Fitness Tracking & Sleep Monitoring\n✅ Water Resistant & Fast Charging', JSON_ARRAY('https://www.machines.com.my/cdn/shop/products/Apple_Watch_Series_9_LTE_45mm_Midnight_Aluminum_Midnight_Sport_Loop_PDP_Image_Position-1__GBEN.jpg?v=1705477161', 'https://i.ebayimg.com/00/s/NzM4WDEzMTI=/z/RcQAAOSwFbRlD6S~/$_57.JPG?set_id=8800005007', 'https://i.ebayimg.com/images/g/kzIAAOSw8RdlS9iD/s-l400.jpg')),
('Bosch Cordless Drill', 799, 0, 1, 9, '🔩 Professional Power Tool 🔩\n⚙️ Features:\n✅ High-Torque Motor for Heavy-Duty Tasks\n✅ Lithium-Ion Battery for Extended Use\n✅ Ergonomic Grip & Lightweight Design\n✅ 2-Speed Transmission for Precision Control', JSON_ARRAY('https://wwarehouse.s3-ap-southeast-1.amazonaws.com/bosch-gsr12v-30-bh.png', 'https://cdn1.npcdn.net/images/1672127664e1aa36efbbdf509c675d9ea8c20fd650.jpg?md5id=f51cf26546d2015352cabae5d9b01b81&new_width=1000&new_height=1000&w=1681968083', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvbPlBVq2TP7Nmm__kRDru7vlyFDeVE1suNA&s')),
('Bosch Washing Machine', 2999, 0, 1, 9, '🧼 Smart & Efficient Laundry Solution 🧼\n🔹 Features:\n✅ 10kg Load Capacity with EcoSilence Drive\n✅ SpeedPerfect for Faster Washing Cycles\n✅ AntiVibration Design for Stability\n✅ Energy-Efficient & Water-Saving Technology', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYG_e4ZfiCwlZbm2VJ_H9yE9qUkewiKvK6vQ&s', 'https://i.ytimg.com/vi/6doqSBcVdig/maxresdefault.jpg', 'https://m.media-amazon.com/images/I/61axzJbR0KL.jpg')),
('Nike Air Force 1', 499, 0, 2, 2, '👟 Iconic Streetwear Sneakers 👟\n🔥 Features:\n✅ Classic Leather Upper for Durability\n✅ Air Cushioning for Ultimate Comfort\n✅ Non-Slip Rubber Sole for Better Grip\n✅ Timeless Design for Any Occasion',JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTErmcR3aliXTRVMRS89DK6HZU_rehVx1o3zw&s', 'https://static.nike.com/a/images/t_default/144d0759-690b-42d5-a9c7-9bc9f36e819e/AIR+FORCE+1+%2707+WB.png', 'https://static.nike.com/a/images/t_PDP_936_v1/f_auto,q_auto:eco/6a0057a6-41bf-433a-b0c2-d0501babfbae/AIR+FORCE+1+%2707+LV8.png')),
('Nike Sportswear Hoodie', 299, 0, 2, 2, '🧥 Stay Warm & Stylish 🧥\n🆕 Features:\n✅ Soft Fleece Lining for Maximum Comfort\n✅ Adjustable Hood for Extra Warmth\n✅ Ribbed Cuffs & Hem for a Snug Fit\n✅ Classic Nike Branding on Front', JSON_ARRAY('https://al-ikhsan.com/cdn/shop/files/b_v_bv2649-010_o.jpg?v=1723017484', 'https://static.nike.com/a/images/t_PDP_936_v1/f_auto,q_auto:eco/42e4f344-3ceb-4d73-8170-4bff5be4595d/AS+W+NSW+PE+CLB+FLC+SHINE+OS.png', 'https://static.nike.com/a/images/t_PDP_936_v1/f_auto,q_auto:eco/kvxobvdic4hpjcwogp6q/B+NSW+HOODIE+FZ+CLUB.png')),
('Rolex Submariner', 40000, 0, 2, 12, '⌚ Luxury Diving Watch ⌚\n✨ Features:\n✅ Precision Automatic Movement\n✅ 300m Water Resistance for Diving\n✅ Stainless Steel Case with Ceramic Bezel\n✅ Iconic Rolex Design & Craftsmanship', JSON_ARRAY('https://bestwatch.my/media/catalog/product/image/width/800/height/800/R/o/Rolex-Submariner-126610LV-0002_5.jpg', 'https://cfkwatch.com/images/web/rolex/2024/05/catalog/watch/upright/mobile/m126618ln-0002_drp-upright-bba-with-shadow.webp', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrYhn4jr9pcz4FnP9fySBpudmf8cTiYtzw6w&s')),
('Rolex Datejust 41', 36000, 0, 2, 12, '💎 Timeless Luxury Timepiece 💎\n🌟 Features:\n✅ 41mm Stainless Steel Case\n✅ Date Display with Cyclops Lens\n✅ Smooth & Fluted Bezel Options\n✅ Signature Rolex Oyster Bracelet', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTetGZaDpgnt49Y6vP9vSYKUB03w5FE1gWGOA&s', 'https://www.ubuy.com.my/productimg/?image=aHR0cHM6Ly9tLm1lZGlhLWFtYXpvbi5jb20vaW1hZ2VzL0kvNjFIN1hLVjRZN0wuX0FDX1VMMTUwMF8uanBn.jpg', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaL5aTR_xN2KJx5LXYDsnfGnGry7ELPwTH2Q&s')),
('Nike Running Shorts', 199, 0, 2, 2, '🏃‍♂️ Lightweight & Breathable Shorts 🏃‍♂️\n💨 Features:\n✅ Dri-FIT Technology to Keep You Cool\n✅ Adjustable Elastic Waistband for Comfort\n✅ Reflective Elements for Night Runs\n✅ Side Pockets for Small Essentials', JSON_ARRAY('https://static.nike.com/a/images/t_PDP_936_v1/f_auto,q_auto:eco/5a953729-1aee-4cd9-b143-4e12fe06351f/AS+M+NK+DFADV+AROSWFT+4INBF+SH.png', 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/e194d965-ebfa-4367-93e1-524716e6dcf9/AS+M+NK+DF+CHALLENGER+72IN1+SH.png', 'https://static.nike.com/a/images/t_default/i1-9f3104d4-e79c-4c6f-b6d9-e883e5ee0b69/AS+M+NK+AROSWFT+4IN+SHORT.png')),
('IKEA Office Chair', 699, 0, 3, 3, '🪑 Ergonomic & Stylish Work Chair 🪑\n💼 Features:\n✅ Adjustable Height & Lumbar Support\n✅ Breathable Mesh Back for Airflow\n✅ Sturdy Frame & Smooth-Rolling Wheels\n✅ Perfect for Home & Office Use', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG6BN-pZ7uGoa0ED8CTaeDxbw0XbuZYaB8tw&s', 'https://www.ikea.com/my/en/images/products/markus-office-chair-vissle-light-grey__1101440_pe866425_s5.jpg', 'https://www.ikea.com/my/en/images/products/groenfjaell-office-chair-with-armrests-letafors-grey-black__1273321_pe930000_s5.jpg')),
('IKEA Wooden Desk', 899, 0, 3, 3, '🖥️ Minimalist Workstation Desk 🖥️\n✨ Features:\n✅ Sturdy Solid Wood Construction\n✅ Spacious Surface for Productivity\n✅ Modern Scandinavian Design\n✅ Easy Assembly & Maintenance', JSON_ARRAY('https://www.ikea.com/my/en/images/products/hemnes-desk-with-2-drawers-white-stain-light-brown__1162633_pe889908_s5.jpg', 'https://www.ikea.com/my/en/images/products/mittzon-desk-sit-stand-electric-walnut-veneer-white__1386164_pe963640_s5.jpg?f=s', 'https://i0.wp.com/www.thesefourwallsblog.com/wp-content/uploads/2023/07/Minimalist-home-office-IKEA-desk-hack-14-1.jpg?ssl=1')),
('L’Oréal Moisturizing Cream', 129, 0, 4, 4, '💆 Hydrating & Anti-Aging Formula 💆\n🌿 Features:\n✅ Deeply Moisturizes & Nourishes Skin\n✅ Enriched with Hyaluronic Acid & Vitamin E\n✅ Reduces Fine Lines & Wrinkles\n✅ Suitable for All Skin Types', JSON_ARRAY('https://www.lorealparis.com.my/-/media/project/loreal/brand-sites/oap/apac/my/local-products/skincare/revitalift/crystal-fresh-hydrating-gel-cream/more-images/media01.png?rev=013778419f85442293ff131912b5ce17&cx=0.52&cy=0.52&cw=500&ch=500&hash=4745E411E148C1D045D7CD15A533C023C3F75E6E', 'https://guardian.com.my/media/wysiwyg/product_desc/Loreal/121111547_3_RV_HA_ACID_DAY_CREAM_50ML.jpg?auto=webp&format=pjpg&quality=85', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxf7y7nsU76Hp6XAHgleeakmT_yHQBeUpQfA&s')),
('GNC Whey Protein', 199, 0, 5, 5, '💪 Build Muscle & Strength 💪\n🏋️‍♂️ Features:\n✅ High-Quality Whey Protein Blend\n✅ 24g Protein per Serving\n✅ Supports Muscle Recovery & Growth\n✅ Low Fat & No Added Sugar', JSON_ARRAY('https://www.gnc.ca/dw/image/v2/BBLB_PRD/on/demandware.static/-/Sites-master-catalog-gnc-ca/default/dw587142c0/hi-res/JPEG%20-%20RGB%20High%20Res/699946_web_CAN%20GNC%20Pro%20Performance%20Whey%20ISO%20Burst%20Chocolate_Front_Tub.jpg?sw=1500&sh=1500&sm=fit', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5vZOqMQAIKlDQd9xgCNgdLV1ywsR5Pma5zg&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTI0X-K637GgRGLkytvT9IT3dMpLKb9dTcMWQ&s')),
('Decathlon Trekking Backpack', 349, 0, 6, 6, '🎒 Ultimate Outdoor Adventure Pack 🎒\n🏕️ Features:\n✅ 50L Capacity for Long Journeys\n✅ Water-Resistant & Durable Material\n✅ Padded Shoulder Straps for Comfort\n✅ Multiple Compartments for Organization', JSON_ARRAY('https://www.insidehook.com/wp-content/uploads/2023/07/Decathlon-Forclaz-Mens-MT500-AIR-5010-L-Backpacking-Pack.jpg?fit=1200%2C800', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0_mSYnh6_7jScBXz1HJgrnOjdTBpWdDENiA&s', 'https://rukminim2.flixcart.com/image/720/864/jvmpci80/rucksack/j/s/h/easyfit-men-s-50-litre-mountain-trekking-backpack-blue-8300849-original-imafghseqru6g7gg.jpeg?q=60&crop=false')),
('Penguin Books Fiction Novel', 69, 0, 7, 7, '📖 Bestselling Literary Masterpiece 📖\n📚 Features:\n✅ Engaging Storyline with Rich Characters\n✅ High-Quality Paperback for Easy Reading\n✅ Perfect Gift for Book Lovers\n✅ Available in Multiple Editions', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNN4nWVDUmxNcpKhJ7T4LqIuNAYe35u_qvaA&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRMRnEmg_jr1SISqYSrqcbdyWRtcVRfNMJEw&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSI1TRGTUhHioFpzrCP01zVd-35YTEMwF9UUQ&s')),
('Lego Technic Supercar', 899, 0, 8, 8, '🚗 Build Your Own Supercar 🚗\n🛠️ Features:\n✅ Highly Detailed & Functional Design\n✅ Authentic Engine & Suspension System\n✅ Interactive Steering & Moving Parts\n✅ Perfect for Collectors & Builders', JSON_ARRAY('https://down-my.img.susercontent.com/file/6e5a434d0b77f43723f3fa9cd08462cd', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEncKVevoGDz2VdR8PV3Gt7KliR71oLgTFzg&s','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR47OPPxsTpOTe57OOw067g16lQaScDl_ApSg&s')),
('Bosch Electric Screwdriver', 299, 0, 9, 9, '🔧 Compact & Powerful Tool 🔧\n⚙️ Features:\n✅ Cordless Design for Easy Handling\n✅ Fast-Charging Battery with LED Indicator\n✅ Ergonomic Grip for Comfortable Use\n✅ Includes Multiple Screw Bits', JSON_ARRAY('https://cdn1.npcdn.net/images/155064711818e8f8bf74423d94bdd95ce8de375a41.jpg?md5id=0d2ac0e8224a99eb05a741574188a823&new_width=1200&new_height=1200&w=1551427812', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgCHkSRK6RJdi1dHAv17FvsByHbIrEDKaoew&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPe2iueoQe0sMl5ipZixC1BVNZVh73rEh8hQ&s')),
('Nestlé Breakfast Cereal', 19, 0, 10, 10, '🥣 Nutritious & Delicious Breakfast 🥣\n🌟 Features:\n✅ Whole Grain Goodness with Fiber\n✅ Enriched with Essential Vitamins & Iron\n✅ Crunchy & Tasty for All Ages\n✅ Quick & Easy to Prepare', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4jH0PvwlIet8n_7RzlAC9Kslek88_ORY8ug&s', 'https://my-test-11.slatic.net/p/06f0949b71c025db028eba256eb3608b.png', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRipO1ayasQP3cayg_LeT-UV1PBF3RdA89DZA&s')),
('Royal Canin Dog Food', 129, 0, 11, 11, '🐶 Premium Nutrition for Your Pet 🐶\n🍖 Features:\n✅ Specially Formulated for Dog Health\n✅ High-Quality Protein & Essential Nutrients\n✅ Supports Digestion & Coat Health\n✅ Recommended by Veterinarians', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROG9wEJaj3pTha-ytjL76MsYfZIupKfYTwDA&s', 'https://down-my.img.susercontent.com/file/sg-11134201-7rbkw-lmvmemz74nkpd4', 'https://my-test-11.slatic.net/p/9a3d0856b42581e079834c419aed3f7d.jpg')),
('Rolex Daytona', 52000, 0, 2, 12, '⌚ Luxury Chronograph Watch ⌚\n✨ Features:\n✅ Precision Swiss Automatic Movement\n✅ 40mm Case with Tachymeter Bezel\n✅ Iconic Rolex Craftsmanship & Design\n✅ Limited Edition Collectible', JSON_ARRAY('https://iflwatches.com/cdn/shop/articles/celebrities-with-rolex-rainbow-daytona-1668498076110.jpg?v=1714386383&width=1000', 'https://www.quera.es/rolex/assets/img/pages/portrait/rolex-watches/watch_assets/editorial/rolex-collection_banner-cosmograph-daytona_portrait.jpg', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyk_Ayb5g76sKcxoUwThxqF9xx44S2rCCkdA&s')),
('Nike Football Boots', 599, 0, 2, 2, '⚽ Speed & Precision on the Field ⚽\n🏆 Features:\n✅ Lightweight Design for Maximum Speed\n✅ Non-Slip Studs for Enhanced Traction\n✅ Cushioned Insole for Extra Comfort\n✅ Worn by Professional Athletes', JSON_ARRAY('https://cdn.media.amplience.net/i/frasersdev/20106471_o?fmt=auto&upscale=false&w=767&h=767&sm=scaleFit&$h-ttl$', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2bUJaMEKJQerR1zjqfvQowASZRXO60gZ8NQ&s', 'https://www.rebelsport.com.au/dw/image/v2/BBRV_PRD/on/demandware.static/-/Sites-srg-internal-master-catalog/default/dwa170ad04/images/66940601/Rebel_66940601_black_hi-res.jpg?sw=750&sh=750&sm=fit&q=60')),
('IKEA LED Desk Lamp', 149, 0, 3, 3, '💡 Energy-Efficient Lighting 💡\n🌟 Features:\n✅ Adjustable Brightness & Angle\n✅ Long-Lasting LED Bulb\n✅ Sleek Minimalist Design\n✅ Perfect for Work & Study', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTw5SWFH1kfHe4ezLwuJJKOa5KbxoYpgPE9Cg&s', 'https://www.ikea.com/my/en/images/products/jansjoe-led-usb-lamp-black__0896445_pe614403_s5.jpg?f=s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-XKuFApTgVRzA3SRZMe9RvzjzdhNv0AWTKA&s')),
('GNC Multivitamins', 79, 0, 5, 5, '💊 Daily Health & Wellness 💊\n🌿 Features:\n✅ Essential Vitamins & Minerals\n✅ Supports Immune System & Energy Levels\n✅ Easy-to-Swallow Tablets\n✅ Trusted by Health Experts', JSON_ARRAY('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIgbIkvO656HwxKkAcTmWqsHp3X2OFoKiyyQ&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_HMlphTEypqhiTN16S5UqREDdYIt6iFIXow&s', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ7KUBCbcg-UxxqwGHNUyuuv2ZfqT4b1xiFQ&s'));

