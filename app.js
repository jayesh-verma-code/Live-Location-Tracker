const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const server = http.createServer(app);
const io = socketio(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, "public")));

// Store user locations
const userLocations = {};

// Helper: Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

io.on("connection", function(socket) {
    console.log("connected:", socket.id);

    socket.on("send-location", function (data) {
        // Save user location
        userLocations[socket.id] = data;

        // Broadcast to all
        io.emit("receive-location", {id: socket.id, ...data});

        // If we have at least 2 users, compute pairwise distances
        const userIds = Object.keys(userLocations);
        if (userIds.length >= 2) {
            for (let i = 0; i < userIds.length; i++) {
                for (let j = i+1; j < userIds.length; j++) {
                    const u1 = userLocations[userIds[i]];
                    const u2 = userLocations[userIds[j]];
                    const distance = getDistance(u1.latitude, u1.longitude, u2.latitude, u2.longitude);
                    console.log(`Distance between ${userIds[i]} and ${userIds[j]}: ${distance.toFixed(2)} m`);
                    if (distance < 5) {
                        console.log(`✅ Users ${userIds[i]} and ${userIds[j]} are within 5 meters!`);
                    } else {
                        console.log(`❌ Users ${userIds[i]} and ${userIds[j]} are more than 5 meters apart.`);
                    }
                }
            }
        }
    });

    socket.on("disconnect", function() {
        delete userLocations[socket.id];
        io.emit("user-disconnect", socket.id);
        console.log("disconnected:", socket.id);
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

server.listen(3000, ()=> {
    console.log('server is running on 3000');
});
