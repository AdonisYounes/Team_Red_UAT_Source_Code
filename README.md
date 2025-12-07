# Campus Study Room Booking System  

Team Red implementation for the CSC 430 final project. This application allows students to book campus study rooms online while giving administrators tools to manage room availability, blocks, and reservations.

---

## 👥 Team Members (Group 7 – Team Red)

- Kareen  
- Jason  
- Adonis  
- Mahmood  
- Shadi  
- Adel  

---

## 📌 Project Overview  

The Campus Study Room Booking System is a web-based system that simulates how students reserve study rooms on campus. Students can search for rooms, filter them, and create reservations, while administrators can define maintenance blocks and view reservation reports.

This repository contains the **baseline executable code** for UAT (User Acceptance Testing) as required for the “Program executable and baseline source code” deliverable.

---

## ⚙️ Tech Stack  

- **Backend:** Node.js, Express.js  
- **Frontend:** HTML, CSS, JavaScript (served from the `public` folder)  
- **Data:** In-memory data structures (from `data.js`) for rooms, users, and reservations  
- **Runtime:** Node.js

---

## ✅ Implemented Features  

Student-facing:

- Login with student credentials  
- Room listing and search  
- Filters for room attributes  
- Create new reservations  
- Weekly booking limit enforcement  
- Double-booking prevention  
- Check-in functionality  
- Auto-cancel of no-shows after 15 minutes  

Admin-facing:

- Admin login  
- Ability to add and manage maintenance blocks  
- Reservation reporting / overview for administrators  

---

## 🚀 How to Run the Project Locally  

1. **Install Node.js** (if not already installed).  
2. **Clone this repository:**
   ```bash
   git clone https://github.com/AdonisYounes/Team_Red_UAT_Source_Code
