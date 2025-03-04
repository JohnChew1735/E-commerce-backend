# E-Commerce Platform Backend

## Overview

This project serves as the backend of a feature-rich e-commerce platform that enables seamless interactions between customers and sellers. It supports multiple user roles with distinct functionalities and ensures secure transactions and data management.

## Features

### **Authentication & User Management**

- Secure user registration for both **customers** and **sellers**
- Login authentication with session persistence
- Forgot password functionality
- Profile management, including the ability to edit profile pictures using **Cloudinary**

### **Seller Features**

- **Product Management:**
  - Add new items to the marketplace
  - Edit item details (e.g., price, description, images)
  - Delete items from the marketplace
- **Inventory Management:**
  - Track and update stock count for each item
  - Receive notifications when stock is low
- **Order & Sales Management:**
  - Get notified when customers purchase products
  - View purchase history
- **Refund & Complaint Handling:**
  - Receive and manage customer complaints
  - Review refund requests and approve or reject them
  - Customers can upload images for complaints via **Cloudinary**

### **Customer Features**

- **Shopping & Transactions:**
  - Browse and purchase products
  - Cancel orders before checkout
- **Payment Processing:**
  - Secure payment gateway integration using **Stripe API**
- **Rewards & Discounts:**
  - Earn daily login coins
  - Use coins for discounts on purchases
- **Reviews & Feedback:**
  - Rate purchased items
  - Leave comments for other users to see
- **Refund Requests:**
  - Request refunds for purchases
  - Receive notifications on approval or rejection

## **Technology Stack**

- **Backend Framework:** Node.js with Express.js
- **Database:** MySQL / PostgreSQL
- **Authentication:** JWT-based authentication
- **Payment Processing:** Stripe API
- **Image Uploads:** Cloudinary API
- **API Communication:** RESTful API

## **Setup Instructions**

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo.git
   cd your-repo
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file and configure **database**, **Stripe**, and **Cloudinary** API keys
4. Run the backend server:
   ```sh
   npm start
   ```

## **Contributing**

Contributions are welcome! Feel free to submit a pull request or open an issue for improvements.

## **License**

This project is licensed under the MIT License.
