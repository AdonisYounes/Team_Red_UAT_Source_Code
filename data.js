// ============================
// Rooms
// ============================
const rooms = [
  { id: "1", name: "Room 1", capacity: 2, equipment: ["whiteboard"] },
  { id: "2", name: "Room 2", capacity: 4, equipment: ["whiteboard", "monitor"] },
  { id: "3", name: "Room 3", capacity: 6, equipment: ["monitor"] }
];

// ============================
// Users
// ============================
const users = [
  { id: "1", email: "student1@example.com", password: "password", isAdmin: false },
  { id: "2", email: "student2@example.com", password: "password", isAdmin: false },
  { id: "3", email: "student3@example.com", password: "password", isAdmin: false },

  { id: "admin", email: "admin@example.com", password: "adminpass", isAdmin: true }
];

// ============================
// Reservation Store
// ============================
let reservations = [];
let nextReservationId = 1;

const WEEKLY_LIMIT_MINUTES = 180;

// ============================
// Helpers
// ============================
function toDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function overlaps(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

function getWeeklyMinutesForUser(userId, date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return reservations
    .filter(r => String(r.userId) === String(userId) && r.status === "ACTIVE")
    .filter(r => {
      const rStart = toDateTime(r.date, r.startTime);
      return rStart >= weekStart && rStart < weekEnd;
    })
    .reduce((total, r) => total + r.duration, 0);
}

function autoCancelNoShows() {
  const now = new Date();

  reservations.forEach(r => {
    if (r.status === "ACTIVE") {
      const start = toDateTime(r.date, r.startTime);
      if (now - start > 15 * 60000 && !r.checkedIn) {
        r.status = "NO_SHOW_CANCELED";
      }
    }
  });
}

// ============================
// Available Rooms
// ============================
function findAvailableRooms({ date, startTime, duration, capacity, equipment }) {
  autoCancelNoShows();

  const start = toDateTime(date, startTime);
  const end = new Date(start.getTime() + duration * 60000);

  return rooms.filter(room => {
    // Capacity filter
    if (capacity && room.capacity < parseInt(capacity, 10)) return false;

    // Equipment filter
    if (equipment && equipment.length > 0) {
      for (let item of equipment) {
        if (!room.equipment.includes(item.trim())) return false;
      }
    }

    // Reservation conflicts
    const conflicts = reservations.some(r => {
      if (String(r.roomId) !== String(room.id) || r.status !== "ACTIVE") return false;

      const rStart = toDateTime(r.date, r.startTime);
      const rEnd = new Date(rStart.getTime() + r.duration * 60000);

      return overlaps(start, end, rStart, rEnd);
    });

    return !conflicts;
  });
}

// ============================
// Create Reservation
// ============================
function createReservation({ userId, roomId, date, startTime, duration }) {
  autoCancelNoShows();

  const room = rooms.find(r => String(r.id) === String(roomId));
  if (!room) throw new Error("Room not found");

  const dur = parseInt(duration, 10);
  if (![30, 60].includes(dur)) {
    throw new Error("Duration must be 30 or 60 minutes");
  }

  const weekly = getWeeklyMinutesForUser(userId, date);
  if (weekly + dur > WEEKLY_LIMIT_MINUTES) {
    throw new Error("Weekly booking limit exceeded");
  }

  const start = toDateTime(date, startTime);
  const end = new Date(start.getTime() + dur * 60000);

  // prevent same-user overlaps (no double-booking)
  for (const r of reservations) {
    if (String(r.userId) === String(userId) && r.status === "ACTIVE") {
      const rStart = toDateTime(r.date, r.startTime);
      const rEnd = new Date(rStart.getTime() + r.duration * 60000);

      if (overlaps(start, end, rStart, rEnd)) {
        if (String(r.roomId) === String(roomId)) {
          // same room, same time
          throw new Error(
            "You cannot book the same room twice at the same time on the same day."
          );
        } else {
          // different room, overlapping time
          throw new Error(
            "You cannot book more than one room at the same time on the same day."
          );
        }
      }
    }
  }

  // availability check
  const available = findAvailableRooms({
    date,
    startTime,
    duration: dur,
    capacity: null,
    equipment: []
  }).some(r => String(r.id) === String(roomId));

  if (!available) {
    throw new Error("Room is not available");
  }

  const reservation = {
    id: String(nextReservationId++),
    userId: String(userId),
    roomId: String(roomId),
    date,
    startTime,
    duration: dur,
    status: "ACTIVE",
    checkedIn: false
  };

  reservations.push(reservation);
  return reservation;
}

// ============================
// Admin: Maintenance Block
// ============================
function createMaintenanceBlock({ roomId, date, startTime, duration }) {
  autoCancelNoShows();

  const room = rooms.find(r => String(r.id) === String(roomId));
  if (!room) throw new Error("Room not found");

  const block = {
    id: String(nextReservationId++),
    userId: "ADMIN_BLOCK",
    roomId: String(roomId),
    date,
    startTime,
    duration: parseInt(duration, 10),
    status: "ACTIVE",
    checkedIn: true
  };

  reservations.push(block);
  return block;
}

// ============================
// NEW: getUserReservations
// ============================
function getUserReservations(userId) {
  autoCancelNoShows();
  if (!userId) return [];
  return reservations.filter(r => String(r.userId) === String(userId));
}

// ============================
// Exports
// ============================
module.exports = {
  rooms,
  users,
  reservations,
  findAvailableRooms,
  createReservation,
  createMaintenanceBlock,
  autoCancelNoShows,
  getUserReservations
};
