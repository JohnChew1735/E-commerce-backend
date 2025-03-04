import express from "express";
import bcrypt, { hash } from "bcrypt";
import mysql from "mysql2/promise";
import cors from "cors";
import Stripe from "stripe";

const app = express();
const stripe = Stripe(
  "sk_test_51QxO9xHF4uq2jEGvqs5tPKW6jvOg3RclbEAanH88dfRnyddYXjaaDuWg0e1d0twvHQyPAJkGoxZHiUMLSFPMjXAJ00hvRWXvwz"
);
app.use(express.json());
app.use(cors());

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { userID, amount, currency } = req.body;

    if (!userID || !amount || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create a new PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });

    console.log("Generated new PaymentIntent:", paymentIntent);

    // Store the new PaymentIntent details in the database
    const updateQuery = `
      UPDATE customer_orders
      SET payment_intent_id = ?, payment_intent_client_secret = ?
      WHERE customer_id = ? AND payment_status = 'pending'
    `;
    const values = [paymentIntent.id, paymentIntent.client_secret, userID];

    const [result] = await database.query(updateQuery, values);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No pending orders found for this user." });
    }

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/get-existing-payment-intent", async (req, res) => {
  try {
    const { userID } = req.body;

    if (!userID) {
      return res.status(400).json({ error: "Missing userID" });
    }

    const query = `
      SELECT payment_intent_id, payment_intent_client_secret
      FROM customer_orders
      WHERE customer_id = ? AND payment_status = 'pending'
      LIMIT 1
    `;

    const [rows] = await database.query(query, [userID]);

    if (rows.length > 0) {
      console.log(
        "Returning existing PaymentIntent:",
        rows[0].payment_intent_id
      );
      return res.json({
        clientSecret: rows[0].payment_intent_client_secret,
      });
    }

    console.log("No existing PaymentIntent found.");
    return res.json({ clientSecret: null });
  } catch (error) {
    console.error("Error fetching existing payment intent:", error);
    res.status(500).json({ error: "Server error." });
  }
});

const database = mysql.createPool({
  host: "localhost",
  user: "test",
  password: "test",
  database: "backend",
});

database
  .getConnection()
  .then(() => console.log("Connected to MySQL Database"))
  .catch((err) => console.error("MySQL Connection Failed:", err));

//set customer order to checkout
app.post("/checkout", async (req, res) => {
  const { userID } = req.body;

  try {
    const [orders] = await database.query(
      "SELECT * FROM customer_orders WHERE customer_id = ? AND status = 'pending'",
      [userID]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "No pending orders found" });
    }

    for (const order of orders) {
      const { item_id, quantity } = order;

      const stockFlowQuery =
        "INSERT INTO stockFlow (item_id, amount, inOrOut, customerID) VALUES (?, ?, 'Out', ?)";
      const stockFlowValues = [item_id, quantity, userID];

      const [stockFlowResult] = await database.query(
        stockFlowQuery,
        stockFlowValues
      );
      if (stockFlowResult.affectedRows === 0) {
        return res
          .status(500)
          .json({ message: "Failed to log stock movement" });
      }

      const reduceStockQuery =
        "UPDATE all_items SET stockCount = stockCount - ? WHERE id = ?";
      const reduceStockValues = [quantity, item_id];

      const [stockUpdateResult] = await database.query(
        reduceStockQuery,
        reduceStockValues
      );
      if (stockUpdateResult.affectedRows === 0) {
        return res
          .status(500)
          .json({ message: "Failed to reduce stock count" });
      }
    }

    const updateOrderStatusQuery =
      "UPDATE customer_orders SET status = 'completed', read_by_seller = 'No', request_for_refund = 'No', payment_status = 'pending' WHERE customer_id = ? AND status = 'pending'";

    const [orderUpdateResult] = await database.query(updateOrderStatusQuery, [
      userID,
    ]);

    if (orderUpdateResult.affectedRows > 0) {
      return res
        .status(200)
        .json({ message: "Checkout successful, stock updated" });
    } else {
      return res.status(500).json({ message: "Failed to update order status" });
    }
  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).json({ message: "Server error during checkout" });
  }
});

//create new seller login details
app.post("/create_new_seller", async (req, res) => {
  const { username, password, email } = req.body;

  // Hash the password before storing it
  const saltRounds = 10; // Number of hashing rounds (10 is a good default)
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const query =
    "INSERT INTO seller_login (username, password, email) VALUES (?, ?, ?)";
  const values = [username, hashedPassword, email];

  try {
    const [response] = await database.execute(query, values);
    if (response.affectedRows > 0) {
      res.status(200).json(`Seller ${req.body.username} has been added`);
    } else {
      res.status(404).json(`Seller ${req.body.username} has not been added `);
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json(`Server error `);
  }
});

//create new user login details
app.post("/create_new_customer", async (req, res) => {
  const { username, password, email } = req.body;

  // Hash the password before storing it
  const saltRounds = 10; // Number of hashing rounds (10 is a good default)
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const query =
    "INSERT INTO customer_login (username, password, email) VALUES (?, ?, ?)";
  const values = [username, hashedPassword, email];

  try {
    const [response] = await database.execute(query, values);
    if (response.affectedRows > 0) {
      res.status(200).json(`Customer ${req.body.username} has been added`);
    } else {
      res.status(404).json(`Customer ${req.body.username} has not been added `);
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json(`Server error `);
  }
});

//login as seller, check if seller details are correct
app.post("/check_seller_info", async (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT password FROM seller_login WHERE username = ?";

  try {
    const [result] = await database.query(query, [username]);
    if (result.length > 0) {
      const hashedPassword = result[0].password;

      //Compare hashed password with entered password
      const match = await bcrypt.compare(password, hashedPassword);
      if (match) {
        return res.status(200).json({ message: "Login successful" });
      } else {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//login as customer, check if seller details are correct
app.post("/check_customer_info", async (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT password FROM customer_login WHERE username = ?";

  try {
    const [result] = await database.query(query, [username]);
    if (result.length > 0) {
      const hashedPassword = result[0].password;

      //Compare hashed password with entered password
      const match = await bcrypt.compare(password, hashedPassword);
      if (match) {
        return res.status(200).json({ message: "Login successful" });
      } else {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      res.status(404).json({ message: `User not found` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//check if customer has email with this username
app.post("/check_customer_email", async (req, res) => {
  const { username, email } = req.body;
  const values = [username, email];
  const query = "SELECT * FROM customer_login WHERE username = ? AND email = ?";
  try {
    const [customer] = await database.query(query, values);
    if (customer.length > 0) {
      res.status(200).json({ message: `Customer ${username} found ` });
    } else {
      res.status(404).json({ message: `Customer ${username} not found ` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: `Server error`, error });
  }
});

//check if seller has email with this username
app.post("/check_seller_email", async (req, res) => {
  const { username, email } = req.body;
  const values = [username, email];
  const query = "SELECT * FROM seller_login WHERE username = ? AND email = ?";
  try {
    const [seller] = await database.query(query, values);
    if (seller.length > 0) {
      res.status(200).json({ message: `Seller ${username} found ` });
    } else {
      res.status(404).json({ message: `Seller ${username} not found` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: `Server error`, error });
  }
});

//change customer password
app.post("/change_customer_password", async (req, res) => {
  const { username, password } = req.body;
  const query = "UPDATE customer_login SET password = ? WHERE username = ?";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const values = [hashedPassword, username];
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Customer password updated" });
    } else {
      res.status(404).json({ message: "Customer password not updated" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error", error });
  }
});

//change seller password
app.post("/change_seller_password", async (req, res) => {
  const { username, password } = req.body;
  const query = "UPDATE seller_login SET password = ? WHERE username = ?";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const values = [hashedPassword, username];
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Seller password updated" });
    } else {
      res.status(404).json({ message: "Seller password not updated" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error", error });
  }
});

//get top 10 clicked items
app.post("/get_all_items", async (req, res) => {
  const query = "SELECT * FROM all_items ORDER BY clicked DESC LIMIT 10";
  try {
    const result = await database.query(query);
    if (result.length > 0) {
      res.status(200).json({ message: "All items listed", items: result });
    } else {
      res.status(400).json({ message: "All items not listed" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error", error });
  }
});

//increase click count
app.post("/increase_click_count", async (req, res) => {
  const { id } = req.body;
  const query = "UPDATE all_items SET clicked = clicked +1 WHERE id = ?";
  const values = [id];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: `item${id} click has been updated` });
    } else {
      res.status(404).json({ message: `item${id} did not update` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: `Server error`, error });
  }
});

//search brands based on customer keyword
async function searchBrand(query) {
  const sqlQuery = "SELECT brandID from brand WHERE name LIKE ?";
  const values = [`%${query}%`];

  try {
    const [result] = await database.query(sqlQuery, values);
    return result.length > 0 ? result[0].brandID : null;
  } catch (error) {
    console.error("Error searching brand", error);
    return null;
  }
}

//search category based on customer keyword
async function searchCategory(query) {
  const sqlQuery = "SELECT categoryID from category WHERE name LIKE ?";
  const values = [`%${query}%`];

  try {
    const result = await database.query(sqlQuery, values);
    return result.length > 0 ? result[0][0].categoryID : null;
  } catch (error) {
    console.error("Error searching category", error);
    return null;
  }
}

//search item based on customer keyword
app.post("/search_items", async (req, res) => {
  const { query } = req.body;

  try {
    const brandID = await searchBrand(query);
    const categoryID = await searchCategory(query);
    let sqlQuery = "SELECT * FROM all_items where name LIKE ?";
    let values = [`%${query}%`];

    if (brandID) {
      sqlQuery += " OR brandID = ?";
      values.push(brandID);
    }

    if (categoryID) {
      sqlQuery += " OR categoryID = ?";
      values.push(categoryID);
    }

    const result = await database.query(sqlQuery, values);

    if (result.length > 0) {
      res.status(200).json({ message: "Items found", items: result });
    } else {
      res.status(404).json({ message: "Items not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error", error });
  }
});

//get product details
app.post("/get_product_details", async (req, res) => {
  const query = "SELECT * FROM all_items WHERE id = ?";
  const values = [req.body.id];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({
        details: result[0],
      });
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//add item to customer cart
app.post("/add_item_to_cart", async (req, res) => {
  const { customer_id, item_id, quantity, price, discount_from_coins } =
    req.body;
  const query =
    "INSERT INTO customer_orders (customer_id, item_id, quantity, price, discount_from_coins) VALUES (?, ?, ?, ?, ?)";
  const values = [customer_id, item_id, quantity, price, discount_from_coins];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Order added." });
    } else {
      res.status(404).json({ message: "Order not added." });
    }
  } catch (error) {
    console.error("ERROR", error);
    res.status(500).json({ message: "Server error." });
  }
});

//get customer id(involved in adding to the table customer order)
app.post("/get_customer_id", async (req, res) => {
  const { username } = req.body;
  const query = "SELECT id FROM customer_login WHERE username = ?";
  const values = [username];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Customer found", data: result[0] });
    } else {
      res.status(404).json({ message: "Customer not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get seller ID
app.post("/get_seller_id", async (req, res) => {
  const { username } = req.body;
  const query = "SELECT id FROM seller_login WHERE username = ?";
  const values = [username];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Seller found", data: result[0] });
    } else {
      res.status(404).json({ message: "Seller not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get orders that are still pending and have not checked out
app.post("/get_pending_order_details", async (req, res) => {
  const { userID } = req.body;

  const query = `
      SELECT co.*, ai.name AS product_name, ai.images AS product_images
      FROM customer_orders co 
      JOIN all_items ai ON co.item_id = ai.id
      WHERE customer_id = ? AND status = "pending"
    `;
  const values = [Number(userID)];
  try {
    const [rows] = await database.query(query, values);
    for (let index = 0; index < rows.length; index++) {
      let product_images = JSON.parse(rows[index].product_images);
      if (product_images.length > 0) {
        rows[index].product_images = product_images[0];
      }
    }
    if (rows.length > 0) {
      res.status(200).json({ message: "Pending orders found", data: rows });
    } else {
      res.status(404).json({ message: "No pending orders found" });
    }
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get all customer orders that is completed
app.post("/get_completed_order_details", async (req, res) => {
  const { userID } = req.body;
  const values = [Number(userID)];
  const query = `SELECT co.*, ai.name as product_name, ai.images as product_images FROM customer_orders co JOIN all_items ai ON co.item_id = ai.id WHERE customer_id =? AND status = "completed" AND payment_status = "paid" `;
  try {
    const [rows] = await database.query(query, values);
    for (let index = 0; index < rows.length; index++) {
      let product_images = JSON.parse(rows[index].product_images);
      if (product_images.length > 0) {
        rows[index].product_images = product_images[0];
      }
    }
    if (rows.length > 0) {
      res.status(200).json({ message: "Completed order found", data: rows });
    } else {
      res.status(404).json({ message: "Completed order not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error", error });
  }
});

//allow customer to delete their orders
app.post("/delete_orders", async (req, res) => {
  const { userID, orderID } = req.body;
  const query = `DELETE from customer_orders WHERE customer_id = ? AND id = ? AND status = "pending"`;
  const values = [userID, orderID];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Customer order deleted" });
    } else {
      res.status(404).json({ message: "Customer order not deleted" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server errorde" });
  }
});

//get all item category
app.post("/get_item_category", async (req, res) => {
  const query = "SELECT name from category";
  try {
    const [result] = await database.query(query);
    if (result.length > 0) {
      const categoryName = [];
      for (let index = 0; index < result.length; index++) {
        categoryName.push(result[index].name);
      }
      res.status(200).json({ message: "Category listed", data: categoryName });
    } else {
      res.status(404).json({ message: "Category not listed" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get all brand name
app.post("/get_item_brand", async (req, res) => {
  const query = "SELECT name FROM brand";
  try {
    const [result] = await database.query(query);
    if (result.length > 0) {
      const brandName = [];
      for (let index = 0; index < result.length; index++) {
        brandName.push(result[index].name);
      }
      res.status(200).json({ message: "Brand listed", data: brandName });
    } else {
      res.status(404).json({ message: "Brand not listed" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//add new category
async function addNewCategory(category) {
  const query = "INSERT INTO category (name) VALUES  (?)";
  const values = [category];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      console.log(result);
      console.log(result.insertId);
      return result.insertId;
    }
  } catch (error) {
    console.error("Error", error);
  }
}

//get categoryID
async function getCategoryID(category) {
  const query = "SELECT categoryID FROM category WHERE name = ?";
  const values = [category];
  try {
    const [result] = await database.query(query, values);
    console.log(result);
    if (result.length > 0) {
      return result[0].categoryID;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error", error);
  }
}

//add new brand
async function addNewBrand(brand) {
  const query = "INSERT INTO brand (name) VALUES  (?)";
  const values = [brand];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      console.log(result);
      console.log(result.insertId);
      return result.insertId;
    }
  } catch (error) {
    console.error("Error", error);
  }
}

//get brand ID
async function getBrandID(brand) {
  const query = "SELECT brandID FROM brand WHERE name = ?";
  const values = [brand];
  try {
    const [result] = await database.query(query, values);
    console.log(result);
    if (result.length > 0) {
      console.log(result[0].brandID);
      return result[0].brandID;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error", error);
  }
}

//add item to the market
app.post("/add_item_to_market", async (req, res) => {
  console.log(req);
  const {
    productName,
    productPrice,
    productDescription,
    productImages,
    category,
    brand,
    sellerID,
  } = req.body;
  try {
    let categoryID = await getCategoryID(category);
    console.log(categoryID);
    if (!categoryID) {
      categoryID = await addNewCategory(category);
      console.log(categoryID);
    }
    let brandID = await getBrandID(brand);
    console.log(brandID);
    if (!brandID) {
      brandID = await addNewBrand(brand);
      console.log(brandID);
    }

    let imagesArray;

    if (Array.isArray(productImages)) {
      imagesArray = productImages;
    } else if (typeof productImages === "string") {
      imagesArray = productImages.split(",").map((url) => url.trim());
    } else {
      imagesArray = [];
    }

    const imagesString = JSON.stringify(imagesArray);
    const formattedDescription = productDescription.replace(/\r\n|\r/g, "\n");
    console.log(categoryID, brandID);
    const query =
      "INSERT INTO all_items (name, price, categoryID, brandID, description, images, sellerID) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const values = [
      productName,
      productPrice,
      categoryID,
      brandID,
      formattedDescription,
      imagesString,
      sellerID,
    ];

    const result = await database.query(query, values);
    if (result) {
      res.status(200).json({ message: "Item added" });
    } else {
      res.status(404).json({ message: "Item not added" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//update existing item in the market
app.post("/update_item", async (req, res) => {
  console.log(req);
  const {
    productName,
    productPrice,
    productDescription,
    productImages,
    category,
    brand,
    itemID,
  } = req.body;

  try {
    let categoryID = await getCategoryID(category);
    if (!categoryID) {
      categoryID = await addNewCategory(category);
    }
    let brandID = await getBrandID(brand);
    if (!brandID) {
      brandID = await addNewBrand(brand);
    }

    let imagesArray;

    if (Array.isArray(productImages)) {
      imagesArray = productImages;
    } else if (typeof productImages === "string") {
      imagesArray = productImages.split(",").map((url) => url.trim());
    } else {
      imagesArray = [];
    }

    const imagesString = JSON.stringify(imagesArray);
    const formattedDescription = productDescription.replace(/\r\n|\r/g, "\n");

    const query =
      "UPDATE all_items SET name = ?, price = ?, categoryID = ?, brandID = ?, description = ?, images = ? WHERE id = ?";
    const values = [
      productName,
      productPrice,
      categoryID,
      brandID,
      formattedDescription,
      imagesString,
      itemID,
    ];
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Item updated" });
    } else {
      res.status(404).json({ message: "Item not updated" });
    }
  } catch (error) {
    console.error("Error", error);
  }
});

//get all items that is put into the market by the seller
app.post("/get_item_by_seller", async (req, res) => {
  const { userID } = req.body;
  const query = "SELECT * from all_items WHERE sellerID = ?";
  const values = [userID];

  try {
    const [rows] = await database.query(query, values);
    if (rows.length > 0) {
      res
        .status(200)
        .json({ message: "Item with seller ID found", data: rows });
    } else {
      res.status(404).json({ message: "Item with seller ID not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//delete all stock first, otherwise cannot delete item
async function deleteStocks(id) {
  const query = "DELETE from stockFlow WHERE item_id = ?";
  try {
    const [result] = await database.query(query, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting stock flow", error);
  }
}

//delete item from all_items
app.post("/delete_item", async (req, res) => {
  const { id } = req.body;
  try {
    await deleteStocks(id);
    const query = "DELETE FROM all_items WHERE id = (?) ";
    const [result] = await database.query(query, [id]);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Item and associated stocks deleted" });
    } else {
      res.status(404).json({ message: "Item not deleted" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get item id
app.post("/get_item_id", async (req, res) => {
  const query = "SELECT id FROM all_items WHERE name = ? AND price = ?";
  const { name, price } = req.body;
  const values = [name, price];
  try {
    const result = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Item id found", data: result[0][0].id });
    } else {
      res.status(404).json({ message: "Item id not found" });
    }
  } catch (error) {
    console.error("Error, error");
    res.status(500).json({ message: "Server error" });
  }
});

//update star ratings of customer order
app.post("/update_rating", async (req, res) => {
  const { user_rating, id } = req.body;
  const query =
    "UPDATE customer_orders SET user_rating = ?, rating = 'Completed' WHERE id = ?";
  const values = [user_rating, id];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Item updated user rating" });
    } else {
      res.status(404).json({ message: "Item not updated user rating" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get average of ratings from users
app.post("/get_average_ratings", async (req, res) => {
  const { item_id } = req.body;
  const query = "SELECT user_rating FROM customer_orders WHERE item_id = ?";
  const values = [item_id];
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      const totalRatings = result.reduce(
        (sum, row) => sum + parseFloat(row.user_rating),
        0
      );
      const averageRating = Number(totalRatings / result.length);
      res.status(200).json({
        message: "Item ratings found",
        averageRating: Number(averageRating).toFixed(1),
      });
    } else {
      res
        .status(202)
        .json({ message: "Item ratings is zero", averageRating: 0 });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get brand name from brandID
app.post("/get_brand_name", async (req, res) => {
  const { brandID } = req.body;
  const query = "SELECT name FROM brand WHERE brandID = ?";
  const values = [brandID];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Brand name found", data: result[0].name });
    } else {
      res.status(404).json({ message: "Brand name not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get category name from categoryID
app.post("/get_category_name", async (req, res) => {
  const { categoryID } = req.body;
  const query = "SELECT name FROM category WHERE categoryID = ?";
  const values = [categoryID];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Category name found", data: result[0].name });
    } else {
      res.status(404).json({ message: "Category name not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get all customer orders not being read by seller yet
app.post("/get_not_read_orders", async (req, res) => {
  const values = [req.body.userID];
  const query =
    " SELECT co.*, ai.name AS item_name, cl.username AS customer_name FROM customer_orders co JOIN all_items ai ON co.item_id = ai.id JOIN customer_login cl ON co.customer_id = cl.id WHERE co.read_by_seller = 'No' AND payment_status = 'paid' AND ai.sellerID = ?";
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Customer orders not read found", orders: result });
    } else {
      res.status(404).json({ message: "Customer orders not read not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//set not read by seller to yes
app.post("/set_notread_to_yes", async (req, res) => {
  const { id } = req.body;
  const query =
    "UPDATE customer_orders SET read_by_seller = 'Yes' WHERE id = ?";
  const values = [id];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: `Customer order id${id} read status is updated` });
    } else {
      res
        .status(404)
        .json({ message: `Customer order read status is not being updated` });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server errort" });
  }
});

//update refund reason
app.post("/update_refund_reason", async (req, res) => {
  const { refund_reason, refund_image, id } = req.body;
  const query =
    'UPDATE customer_orders SET request_for_refund = "Yes, pending approval", refund_reason = ?, refund_image = ? WHERE id = ?';
  const values = [refund_reason, refund_image, id];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Refund request updated" });
    } else {
      res.status(404).json({ message: "Refund request not updated" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//as customer, view all orders that he or she complained
app.post("/get_customer_refund_as_customer", async (req, res) => {
  const { userID } = req.body;
  const query =
    'SELECT co.*, ai.name AS product_name, ai.images AS product_images FROM customer_orders co JOIN all_items ai ON co.item_id = ai.id WHERE request_for_refund IN ("Approved", "Denied") AND customer_id = ?';
  const values = [userID];
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res.status(200).json({ message: "Customer refund found", data: result });
    } else {
      res.status(404).json({ message: "Customer refund not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//as seller, get all customer complains that is dedicated to me
app.post("/get_customer_refund_as_seller", async (req, res) => {
  const { id } = req.body;
  const query =
    'SELECT co.*, ai.name AS product_name, ai.id AS item_id, ai.images as product_images, cl.username AS customer_name FROM customer_orders co JOIN customer_login cl ON co.customer_id = cl.id JOIN all_items ai ON co.item_id = ai.id WHERE request_for_refund != "No" AND ai.sellerID = ?';
  const values = [id];
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Customer refund for seller found", data: result });
    } else {
      res.status(404).json({ message: "Customer refund for seller not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//set customer refund to approve
app.post("/set_request_for_refund_to_approved", async (req, res) => {
  const { orderID } = req.body;
  const query =
    'UPDATE customer_orders SET request_for_refund = "Approved" WHERE id = ?';
  const values = [orderID];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "Customer order request for refund approved" });
    } else {
      res
        .status(404)
        .json({ message: "Customer order request for refund not approved" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//set customer refund to denied
app.post("/set_request_for_refund_to_denied", async (req, res) => {
  const { orderID } = req.body;
  const query =
    'UPDATE customer_orders SET request_for_refund = "Denied" WHERE id = ?';
  const values = [orderID];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res
        .status(200)
        .json({ message: "Customer order request for refund denied" });
    } else {
      res
        .status(404)
        .json({ message: "Customer order request for refund not denied" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//update stock flow for seller adding inventory
app.post("/update_stock_flow", async (req, res) => {
  const { item_id, amount, inOrOut, sellerID } = req.body;
  const query =
    "INSERT INTO stockFlow (item_id, amount, inOrOut, sellerID) VALUES (?, ?, ?,?)";
  const values = [item_id, amount, inOrOut, sellerID];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      try {
        const updatedResult = await increaseStockCount(item_id, amount);
        if (updatedResult.affectedRows > 0) {
          res
            .status(200)
            .json({ message: "Item stock count in all_items increased" });
        } else {
          res
            .status(404)
            .json({ message: "Item stock count in all_items not increased" });
        }
      } catch (error) {
        console.error("Error", error);
        res
          .status(500)
          .json({ message: "Server error while increasing stock count" });
      }
    } else {
      res
        .status(404)
        .json({ message: "Stock for that item has not been increased." });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error." });
  }
});

//increase stock count for that product in all_items table
async function increaseStockCount(item_id, amount) {
  const query = "UPDATE all_items SET stockCount = stockCount + ? WHERE id = ?";
  const values = [amount, item_id];

  try {
    const [result] = await database.query(query, values);
    return result;
  } catch (error) {
    console.error("Error increasing stock count:", error);
  }
}

app.post("/increase_stockCount_for_payment_abandoned", async (req, res) => {
  const stockUpdates = req.body.stockCountUpdate; // Expecting an array

  if (!Array.isArray(stockUpdates) || stockUpdates.length === 0) {
    return res.status(400).json({ message: "Invalid stock data" });
  }

  try {
    for (const { amount, item_id } of stockUpdates) {
      const query =
        "UPDATE all_items SET stockCount = stockCount + ? WHERE id = ?";
      const values = [amount, item_id];
      await database.query(query, values);
    }

    res
      .status(200)
      .json({ message: "Stock count updated for abandoned payment" });
  } catch (error) {
    console.error("Error updating stock count:", error);
    res.status(500).json({ message: "Error updating stock count" });
  }
});

//update stock flow for customer refund
app.post("/update_stock_flow_for_customer", async (req, res) => {
  const { item_id, amount, inOrOut, customerID } = req.body;
  const query =
    "INSERT INTO stockFlow (item_id, amount, inOrOut, customerID) VALUES (?, ?, ?,?)";
  const values = [item_id, amount, inOrOut, customerID];

  try {
    console.log(values);
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      try {
        const updatedResult = await increaseStockCount(item_id, amount);
        if (updatedResult.affectedRows > 0) {
          res
            .status(200)
            .json({ message: "Item stock count in all_items increased" });
        } else {
          res
            .status(404)
            .json({ message: "Item stock count in all_items not increased" });
        }
      } catch (error) {
        console.error("Error", error);
        res
          .status(500)
          .json({ message: "Server error while increasing stock count" });
      }
    } else {
      res
        .status(404)
        .json({ message: "Stock for that item has not been increased." });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error." });
  }
});

//get all stock flow from product ID
app.post("/get_all_stock_flow", async (req, res) => {
  const { item_id } = req.body;
  const query = "SELECT * FROM stockFlow WHERE item_id = ?";
  const values = [item_id];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Stock flow for inventory found", data: result });
    } else {
      res
        .status(404)
        .json({ message: "Stock flow for inventory is not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//update coin for customer
app.post("/increase_coin_for_customer", async (req, res) => {
  const { userID } = req.body;
  const query = "UPDATE customer_login SET coins = coins + 10 WHERE id = ?";
  const values = [userID];

  try {
    console.log(values);
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User coins increased" });
    } else {
      res.status(404).json({ message: "User coins not increased" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get coin based on user ID
app.post("/get_coin_details", async (req, res) => {
  const { id } = req.body;
  const query = "SELECT coins FROM customer_login WHERE id = ?";
  const values = [id];
  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "User coins details found", data: result[0].coins });
    } else {
      res.status(404).json({ message: "User coins details not found" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//reduce customer coins back to 0
app.post("/reduce_customer_coins", async (req, res) => {
  const { id } = req.body;
  const query = "UPDATE customer_login SET coins = 0 WHERE id = ?";
  const values = [id];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User coins details reduced" });
    } else {
      res.status(404).json({ message: "User coins details not reduced" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//allow for adding more than 10 coins mainly from deleting orders and when refund approved
app.post("/increase_customer_coins_more_than_10coins", async (req, res) => {
  const { userID, coinsUsed } = req.body;
  const query = "UPDATE customer_login SET coins = coins + ? WHERE id = ?";
  const values = [coinsUsed, userID];

  try {
    console.log(req.body);
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "User coins increased" });
    } else {
      res.status(404).json({ message: "User coins not increased" });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error" });
  }
});

//add customer feedback to table
app.post("/add_customer_feedback", async (req, res) => {
  const { item_id, customer_id, customerFeedback } = req.body;
  const query =
    "INSERT INTO customerFeedback (item_id, customer_id, customer_feedback) VALUES (?, ?,?)";
  const values = [item_id, customer_id, customerFeedback];
  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Customer feedback added." });
    } else {
      res.status(404).json({ message: "Customer feedback not added." });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error." });
  }
});

//get customer feedback from product ID
app.post("/get_customer_feedback_from_productID", async (req, res) => {
  const { item_id } = req.body;
  const query =
    "SELECT cf.*, cl.username AS customerName FROM customerFeedback cf JOIN customer_login cl ON cf.customer_id = cl.id WHERE item_id = ?";
  const values = [item_id];

  try {
    const result = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Customer feedback found.", data: result[0] });
    } else {
      res.status(404).json({ message: "Customer feedback not found." });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error." });
  }
});

//get customer information from userID
app.post("/get_customer_information", async (req, res) => {
  const { userID } = req.body;
  const query = "SELECT * from customer_login WHERE id = ?";
  const values = [userID];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Customer information acquired", data: result });
    } else {
      res.status(404).json({ message: "Customer information not found." });
    }
  } catch (error) {
    console.error("Error getting customer information", error);
    res.status(500).json({ message: "Server error." });
  }
});

//update customer information
app.post("/update_customer_information", async (req, res) => {
  try {
    const { profileImage, username, email, password, id } = req.body;
    let query =
      "UPDATE customer_login SET profileImage = ?, username = ?, email = ?";
    const values = [profileImage, username, email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = ?";
      values.push(hashedPassword);
    }

    query += " WHERE id = ?";
    values.push(id);

    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Customer information updated." });
    } else {
      res.status(404).json({ message: "Customer information not updated." });
    }
  } catch (error) {
    console.error("Error updating customer information", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/add_to_wishlist", async (req, res) => {
  const { item_id, customer_id, quantity, note } = req.body;
  const query =
    "INSERT INTO wishlist (item_id, customer_id, quantity, note) VALUES (?, ?, ?, ?)";
  const values = [item_id, customer_id, quantity, note];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Wishlist added" });
    } else {
      res.status(404).json({ message: "Wishlist not added" });
    }
  } catch (error) {
    console.error("Error adding to wishlist", error);
    res.status(500).json({ message: "Server errorit" });
  }
});

//get my wishlist based on userID
app.post("/get_wishlist_based_on_userID", async (req, res) => {
  const { userID } = req.body;
  const query =
    "SELECT wl.*, wl.id AS wishlistID, ai.* FROM wishlist wl JOIN all_items ai ON wl.item_id = ai.id WHERE customer_id = ?";
  const values = [userID];

  try {
    const [result] = await database.query(query, values);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Customer wishlist found.", data: result });
    } else {
      res.status(404).json({ message: "Customer wishlist not found." });
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/update_wishlist", async (req, res) => {
  const { id } = req.body;
  const query = 'UPDATE wishlist SET status = "added to cart" WHERE id = ?';
  const values = [id];

  try {
    const [result] = await database.query(query, values);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Customer wishlist updated." });
    } else {
      res.status(404).json({ message: "Customer wishlist not updated." });
    }
  } catch (error) {
    console.error("Error updating wishlist table", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/get_all_payment_pending_orders", async (req, res) => {
  const { userID } = req.body;
  const query =
    "SELECT co.*, ai.name AS product_name FROM customer_orders co JOIN all_items ai ON ai.id = co.item_id WHERE customer_id = ? AND payment_status = 'pending'";
  const values = [userID];
  console.log("pending payment order user ID", values);
  try {
    const [result] = await database.query(query, values);
    console.log("All payment pending order", result);
    if (result.length > 0) {
      res
        .status(200)
        .json({ message: "Payment pending order found", data: result });
    } else {
      res.status(404).json({ message: "Payment pending order not found" });
    }
  } catch (error) {
    console.error("Error getting pending payment");
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/set_pending_payment_to_abandoned", async (req, res) => {
  const { orderIDs } = req.body;
  if (!Array.isArray(orderIDs) || orderIDs.length === 0) {
    return res
      .status(400)
      .json({ message: "Invalid or empty orderIDs array." });
  }

  const query =
    'UPDATE customer_orders SET payment_status = "abandoned" WHERE id IN (?)';

  try {
    const [result] = await database.query(query, [orderIDs]);
    if (result.affectedRows > 0) {
      res.status(200).json({
        message: `${result.affectedRows} pending payment order(s) set to abandoned.`,
      });
    } else {
      res.status(404).json({ message: "No matching orders found." });
    }
  } catch (error) {
    console.error("Error setting pending payment to abandoned:", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/update-payment-status", async (req, res) => {
  const { paymentIntent } = req.body;
  const query =
    'UPDATE customer_orders SET payment_status = "paid" WHERE payment_intent_id = ?';
  const values = [paymentIntent];

  try {
    const [result] = await database.query(query, values);
    console.log(result);
    console.log(values);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Payment status updated successfully." });
    } else {
      res
        .status(404)
        .json({ message: "Order not found for this payment intent." });
    }
  } catch (error) {
    console.error("Error updating payment status", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post(
  "/update_stock_flow_for_customer_for_payment_abandoned",
  async (req, res) => {
    const { stockUpdates } = req.body; // Expecting an array

    if (!Array.isArray(stockUpdates) || stockUpdates.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty stockUpdates array." });
    }

    try {
      const values = stockUpdates.map(
        ({ item_id, amount, inOrOut, customerID }) => [
          item_id,
          amount,
          inOrOut,
          customerID,
        ]
      );

      const query =
        "INSERT INTO stockFlow (item_id, amount, inOrOut, customerID) VALUES ?";
      const [result] = await database.query(query, [values]);

      if (result.affectedRows > 0) {
        res.status(200).json({ message: "Stock flow updated successfully." });
      } else {
        res.status(400).json({ message: "Stock flow update failed." });
      }
    } catch (error) {
      console.error("Error updating stock flow:", error);
      res.status(500).json({ message: "Server error updating stock flow." });
    }
  }
);

app.listen(8000, () => {
  console.log("App is listening on port 8000");
});
