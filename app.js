const express = require("express");
const session = require("express-session");
const path = require("path");

const {
  rooms,
  users,
  reservations,
  findAvailableRooms,
  createReservation,
  createMaintenanceBlock,
  autoCancelNoShows,
  getUserReservations
} = require("./data");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "team-red-secret",
    resave: false,
    saveUninitialized: false
  })
);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Default route -> login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Helpers
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// ============ AUTH ============

// POST /api/login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin
  };

  res.json({ message: "Login successful", user: req.session.user });
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logged out" });
  });
});

// ============ ROOMS ============

// GET /api/rooms - search available rooms
app.get("/api/rooms", requireLogin, (req, res) => {
  const { date, startTime, duration, capacity, equipment } = req.query;

  if (!date || !startTime || !duration) {
    return res
      .status(400)
      .json({ message: "date, startTime, and duration are required" });
  }

  const equipmentList =
    equipment && equipment.trim().length > 0
      ? equipment.split(",").map(e => e.trim())
      : [];

  try {
    const available = findAvailableRooms({
      date,
      startTime,
      duration: parseInt(duration, 10),
      capacity: capacity ? parseInt(capacity, 10) : null,
      equipment: equipmentList
    });

    res.json({ rooms: available });
  } catch (err) {
    console.error("Error in /api/rooms:", err);
    res.status(500).json({ message: "Could not search rooms" });
  }
});

// ============ RESERVATIONS ============

// POST /api/reservations - create reservation for logged in user
app.post("/api/reservations", requireLogin, (req, res) => {
  const { roomId, date, startTime, duration } = req.body;

  if (!roomId || !date || !startTime || !duration) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const reservation = createReservation({
      userId: req.session.user.id,
      roomId,
      date,
      startTime,
      duration
    });

    // <<< changed: include success message >>>
    res.json({
      message: "Reservation successful.",
      reservation
    });
  } catch (err) {
    console.error("Error creating reservation:", err.message);
    res.status(400).json({ message: err.message });
  }
});

// GET /api/reservations
// Students: only their reservations
// Admin: all reservations
app.get("/api/reservations", requireLogin, (req, res) => {
  autoCancelNoShows();

  const user = req.session.user;
  if (user.isAdmin) {
    return res.json({ reservations });
  }

  const userReservations = getUserReservations(user.id);
  return res.json({ reservations: userReservations });
});

// POST /api/reservations/:id/checkin
app.post("/api/reservations/:id/checkin", requireLogin, (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  const reservation = reservations.find(r => r.id === id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  if (!user.isAdmin && reservation.userId !== user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (reservation.status !== "ACTIVE") {
    return res.status(400).json({ message: "Reservation is not active" });
  }

  reservation.checkedIn = true;
  res.json({ message: "Checked in", reservation });
});

// POST /api/reservations/:id/cancel
app.post("/api/reservations/:id/cancel", requireLogin, (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  const reservation = reservations.find(r => r.id === id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  if (!user.isAdmin && reservation.userId !== user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (reservation.status !== "ACTIVE") {
    return res.status(400).json({ message: "Reservation is not active" });
  }

  reservation.status = "CANCELED";
  res.json({ message: "Reservation canceled", reservation });
});

// ============ ADMIN ============

// GET /api/admin/reservations
app.get("/api/admin/reservations", requireAdmin, (req, res) => {
  autoCancelNoShows();
  res.json({ reservations });
});

// POST /api/admin/blocks - maintenance block
app.post("/api/admin/blocks", requireAdmin, (req, res) => {
  const { roomId, date, startTime, duration } = req.body;

  if (!roomId || !date || !startTime || !duration) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const block = createMaintenanceBlock({
      roomId,
      date,
      startTime,
      duration
    });
    res.json({ block });
  } catch (err) {
    console.error("Error creating maintenance block:", err);
    res.status(400).json({ message: err.message });
  }
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
