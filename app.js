const express = require("express");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const path = require("path");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//Register new user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUserDetailsQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserDetailsQuery);
  if (dbUser === undefined && password.length > 4) {
    //create new user
    const createNewUserQuery = `
        INSERT INTO user (username,name,password,gender,location)
        VALUES(
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
    await db.run(createNewUserQuery);
    response.send("User created successfully");
  } else if (dbUser === undefined && password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Authenticate User
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  let isPasswordTrue = null;
  const isUsernameExistsQuery = `
    SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(isUsernameExistsQuery);
  if (dbUser !== undefined) {
    isPasswordTrue = await bcrypt.compare(password, dbUser.password);
  }
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else if (dbUser !== undefined && isPasswordTrue === true) {
    response.status(200);
    response.send("Login success!");
  } else if (dbUser !== undefined && isPasswordTrue === false) {
    response.status(400);
    response.send("Invalid password");
  }
});

//Change Password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  let isPasswordTrue = null;
  const getUserDetailsQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;
  const dbUser = await db.get(getUserDetailsQuery);

  if (dbUser !== undefined) {
    isPasswordTrue = await bcrypt.compare(oldPassword, dbUser.password);
  }
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else if (
    dbUser !== undefined &&
    isPasswordTrue === true &&
    newPassword.length > 4
  ) {
    const encryptedPassword = await bcrypt.hash(newPassword, 10);
    const updatePasswordQuery = `
      UPDATE user
      SET
      password = '${encryptedPassword}'
      WHERE
      username = '${username}';`;
    await db.run(updatePasswordQuery);
    response.status(200);
    response.send("Password updated");
  } else if (dbUser !== undefined && isPasswordTrue === false) {
    response.status(400);
    response.send("Invalid current password");
  } else if (
    dbUser !== undefined &&
    isPasswordTrue === true &&
    newPassword.length < 5
  ) {
    response.status(400);
    response.send("Password is too short");
  }
});
module.exports = app;