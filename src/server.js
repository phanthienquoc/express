// Create express app
import express from 'express';
import http from "http";
import https from "https";
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import md5 from 'md5';

import bodyParser from 'body-parser';
import db from "./database.js";

// import AppDAO from './dao';
import TaskRepository from './task_repository';
import ProjectRepository from './project_repository';

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Server config
const HTTP_PORT = 8887;
const HTTPS_PORT = 8888;
const credentials = {
    key: fs.readFileSync(path.resolve('./config/cert/server.key')),
    cert: fs.readFileSync(path.resolve('./config/cert/server.cert')),
};

http.createServer(app).listen(HTTP_PORT);
https.createServer(credentials, app).listen(HTTPS_PORT);

// Start server
// app.listen(HTTP_PORT, () => {
//     console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT))
// });
// Root endpoint
app.get("/", (req, res, next) => {
    res.json({ "message": "Ok" })
});

// Insert here other API endpoints

app.get("/api/users", (req, res, next) => {
    let sql = "select * from user"
    let params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        })
    });
});

app.get("/api/user/:id", (req, res, next) => {
    let sql = "select * from user where id = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": row
        })
    });
});

app.post("/api/user/new", (req, res, next) => {
    let errors = []
    if (!req.body.password) {
        errors.push("No password specified");
    }
    if (!req.body.email) {
        errors.push("No email specified");
    }
    if (errors.length) {
        res.status(400).json({ "error": errors.join(",") });
        return;
    }
    let data = {
        name: req.body.name,
        email: req.body.email,
        password: md5(req.body.password)
    }
    let sql = 'INSERT INTO user (name, email, password) VALUES (?,?,?)'
    let params = [data.name, data.email, data.password]
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({
            "message": "success",
            "data": data,
            "id": this.lastID
        })
    });
})

app.patch("/api/user/:id", (req, res, next) => {
    let data = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password ? md5(req.body.password) : null
    }
    db.run(
        `
            UPDATE user set 
            name = COALESCE(?,name), 
            email = COALESCE(?,email), 
            password = COALESCE(?,password) 
            WHERE id = ?
        `,
        [data.name, data.email, data.password, req.params.id],
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": res.message })
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
        });
})

app.delete("/api/user/:id", (req, res, next) => {
    db.run(
        'DELETE FROM user WHERE id = ?',
        req.params.id,
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": res.message })
                return;
            }
            res.json({ "message": "deleted", changes: this.changes })
        });
})

// Default response for any other request
app.use(function (req, res) {
    res.status(404);
});
