const db = require("../models");
const User = db.user;
var bcrypt = require("bcryptjs");
const crypto = require("crypto");
var nodemailer = require("nodemailer");
const { user } = require("../models");

var transporter = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "fb5b8567e48dfc", //generated by Mailtrap
    pass: "f0fe6f1f5267ff", //generated by Mailtrap
  },
});
exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};
exports.userBoard = (req, res) => {
  res.status(200).send("User Content.");
};
exports.adminBoard = (req, res) => {
  res.status(200).send("Admin Content.");
};
exports.moderatorBoard = (req, res) => {
  res.status(200).send("Moderator Content.");
};
exports.userInfor = (req, res) => {
  User.find().exec((err, users) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      var userList = [];
      users.forEach(function (user) {
        if (user.role != "admin") {
          userList.push({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            siteid: user.siteid,
          });
        }
      });
      return res.send(userList);
    }
  });
};
exports.changePassword = (req, res) => {
  User.findById(req.userId).exec((err, userObj) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      var passwordIsValid = bcrypt.compareSync(
        req.body.oldpassword,
        userObj.password
      );
      if (passwordIsValid) {
        userObj.password = bcrypt.hashSync(req.body.newpassword, 8);
        userObj.save();
        return res.send({ message: "your password has changed successfully" });
      } else
        return res
          .status(402)
          .send({ message: "your password is wrong! Please do it again" });
    }
  });
};
exports.resetPasswordAdmin = (req, res) => {
  var user_id = req.body.userid || req.query.userid;
  User.findById(user_id).exec((err, userObj) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      userObj.password = bcrypt.hashSync(req.body.newpassword, 8);
      userObj.save();
      return res.send({ message: "Reset password successfully !" });
    }
  });
};
exports.forgetPassword = (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        return res
          .status(422)
          .send({ message: "user don't exist with that email" });
      }
      user.resetToken = token;
      user.expireToken = Date.now() + 3600000;
      user.save().then((result) => {
        transporter.sendMail(
          {
            to: user.email,
            from: '"Example Team" <from@example.com>',
            subject: "password reset",
            html: `
          <p>You requested for password reset</p>
          <h5>click in this <a href="http://localhost:4000/public/reset/${token}">Link</a> to reset password</p>
          `,
          },
          (error, info) => {
            if (error) {
              return console.log(error);
            }
            console.log("Message sent: %s", info.messageId);
          }
        );
        res.send({ message: "check you email" });
      });
    });
  });
};
exports.resetPasswordEmail = (req, res) => {
  const newpassword = req.body.password;
  const senttoken = req.body.token;
  User.findOne({
    resetToken: senttoken,
    expireToken: { $gt: Date.now() },
  }).then((user) => {
    if (!user) {
      return res.status(422).send({ message: "Session expired. Try again !" });
    }
    user.password = bcrypt.hashSync(newpassword, 8);
    user.resetToken = undefined;
    user.expireToken = undefined;
    user.save().then((saveduser) => {
      res.send({ message: "password updated successfully" });
    });
  });
};
exports.deleteUser = (req, res) => {
  var user_id = req.body.userid || req.query.userid;
  User.findById(user_id).exec((err, userObj) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      userObj.remove();
      res.send({ message: "user has been deleted" });
    }
  });
};
exports.assignSite = (req, res) => {
  var user_id = req.body.userid || req.query.userid;
  var site_id = req.body.siteid || req.query.siteid;
  User.findById(req.userId).exec((err, userObj) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      var sign = 0;
      userObj.siteid.map((item, index) => {
        if (item == site_id) {
          sign = 1;
        }
      });
      if (sign != 1) {
        userObj.siteid.push(site_id);
        userObj.save();
      }
    }
  });
  if (user_id != null) {
    User.findById(user_id).exec((err, userObj) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        var sign = 0;
        userObj.siteid.map((item, index) => {
          if (item == site_id) {
            sign = 1;
          }
        });
        if (sign != 1) {
          userObj.siteid.push(site_id);
          userObj.save();
          res.send({
            message: "site has been assigned to user!",
            already: false,
          });
        } else {
          res.send({
            message: "Site has been assigned to this account before",
            already: true,
          });
        }
      }
    });
  } else {
    res.send({ message: "site has been assigned to Admin!", already: true });
  }
};
exports.unassignSite = (req, res) => {
  User.findById(req.userId).exec((err, userObj) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      if (userObj.siteid.indexOf(req.body.siteid) != -1) {
        userObj.siteid.splice(userObj.siteid.indexOf(req.body.siteid), 1);
        userObj.save();
      }
    }
  });
  let account = req.body.account;
  if (account.length) {
    account.map((item, index) => {
      User.findOne({
        username: item,
      }).then((userObj) => {
        if (userObj) {
          if (userObj.siteid.indexOf(req.body.siteid) != -1) {
            userObj.siteid.splice(userObj.siteid.indexOf(req.body.siteid), 1);
            userObj.save();
          }
        }
      });
    });
    res.send({ message: "done" });
  }
};
