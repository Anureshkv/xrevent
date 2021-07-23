
var express = require("express");
var router = express.Router();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const jwt = require("jsonwebtoken");
const JWT_KEY = "jwtactive987";
const {User}  = require("../models/User");
const { Otp } = require("../models/Otp");
const bcrypt = require('bcryptjs');
require('dotenv/config')
const mailer = require('../Nodemailer')


router.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id"
  );

  res.header(
    "Access-Control-Expose-Headers",
    "x-access-token, x-refresh-token"
  );

  next();
});

//*****************  Register User ***************** //


router.post("/register", (req, res,next) => {

  let body = req.body;
  let newUser = new User(body);
  newUser.save().then(() => {
    return newUser.createSession();
}).then((refreshToken) => {

    return newUser.generateAccessAuthToken().then((accessToken) => {
        return { accessToken, refreshToken }
    });
}).then((authTokens) => {
     res
        .header('x-refresh-token', authTokens.refreshToken)
        .header('x-access-token', authTokens.accessToken)
        .send(newUser);
}).catch((e) => {
    res.status(400).send(e);
})
User.findOne({ email: req.body.email }).then((user) => {
  if (user) {
      errors.push({ msg: 'Email ID already registered' });
      res.send(errors)
      
  } else {

      const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
        );

      oauth2Client.setCredentials({
          refresh_token: process.env.REFRESH_TOKEN
      });
      const accessToken = oauth2Client.getAccessToken()
      const { firstName, email, password } = req.body; 
      const token = jwt.sign({ firstName, email, password }, JWT_KEY, { expiresIn: '30m' });
      const CLIENT_URL = process.env.FRONT_URI;

      const output = `
      <h2>Please click on below link to activate your account</h2>
      <p>${CLIENT_URL}/activate/${token}</p>
      <p><b>NOTE: </b> The above activation link expires in 30 minutes.</p>
      `;

      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type:"OAuth2",
            user:"nodejsa@gmail.com",
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken:accessToken
          },
      });

      const mailOptions = {
          from: 'Anuresh <anureshkv1@gmail.com>',
          to: email, // list of receivers
          subject: "Account Verification: Mindcare",
          generateTextFromHTML: true,
          html: output, // html body
      };

      mailer(transporter,mailOptions)

  }
});
});


//*****************  email activation ***************** //

// router.put("/activate/:token", (req, res) => {
//   const token = req.params.token;

//   if (token) {
//     jwt.verify(token, JWT_KEY, async function (err, user) {
//       if (err) {
//         return res
//           .status(500)
//           .json({ message: " Activation Link has expired" });
//       } else {
//         const { firstName, email, password } = user;
//         try {
//           const user = new User({ firstName, email, password });
//           await user.save();
//           return res
//             .status(200)
//             .json({ message: "Registration Success. Please Signin..." });
//         } catch (error) {
//           return res.status(401).json({
//             error: "Error Saving User in DB. Please Try Again...",
//           });
//         }
//       }
//     });
//   }
// });


//*****************  OTP for password forget ***************** //

router.post("/sendOTP", async (req, res) => {
  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID, // ClientID
    process.env.CLIENT_SECRET, // Client Secret
    process.env.REDIRECT_URI// Redirect URL
    );
 
  oauth2Client.setCredentials({
    refresh_token:
    process.env.REFRESH_TOKEN
   });
  const accessToken = oauth2Client.getAccessToken();

  try {
    const user = await User.findOne().or([
      {
        email: req.body.email,
      },
      {
        name: req.body.userName,
      },
    ]);

    if (!user) {
      return res.json({ msg: "User Does not Exist" });
    }
    var digits = "0123456789";
    let otp = "";
    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    let OTP = new Otp({
      userId: user._id,
      otp: otp,
    });
    OTP.save((err) => {
      if (err) {
        return res.json({ msg: err.message });
      }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type:"OAuth2",
          user:"nodejsa@gmail.com",
          clientId:process.env.CLIENT_ID,
          clientSecret:process.env.CLIENT_SECRET,
          refreshToken:process.env.REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });

       // send mail with defined transport object
  const mailOptions = {
    from: '"Mindcare" <nodejsa@gmail.com>', // sender address
    to: req.body.email, // list of receivers
    subject: "Account Verification: MindCare", // Subject line
    generateTextFromHTML: true,
    html: "Hello " +
    user.userName +
    " Here is the OTP " +
    otp +
    " and it is valid for 5 mins from now!",
  };
  mailer(transporter, mailOptions);
  res.json({ msg: "Email Sent!" });
});
} catch (error) {
console.log(error.message);
}
});
 

//*****************  OTP Confirmation ***************** //

router.post("/confirmOTP", async (req, res) => {
  Otp.findOne({ otp: req.body.otp }, (err, otp) => {
   
    if (!otp) {
      return res.status(400).json({ msg: "OTP Not Valid" });
    }
    User.findOne({ _id: otp.userId }, (err, user) => {
      if (err) {
        return res.json({ msg: err.message });
      }
      if (otp.isUsed) {
        return res.status(500).json({ msg: "OTP is Already Used" });
      }
      otp.isUsed = true;
      otp.save((err) => {
        if (err) {
          return res.json({ msg: err.message });
        }
        res.status(201).json({msg:"OTP Verified Successfully"});
      });
    });
  });
});


//*****************  change password ***************** //

router.put("/updatePassword", async (req, res) => {
  
  const { email, password } = req.body;
  try {
    var encryptpassword=bcrypt.hashSync(password,10);
    let user = await User.findOneAndUpdate({ email }, { password: encryptpassword });

    
    await user.save();
    res.json(user);
  } catch (error) {
    console.log(error.message);
  }
});

//*****************  Log user ***************** //


router.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          return user.generateAccessAuthToken().then((accessToken) => {
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
          res
          
            .header("x-refresh-token", authTokens.refreshToken)
            .header("x-access-token", authTokens.accessToken)
            .send(authTokens);
        });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});




//####################################//
let verifySession = (req, res, next) => {

  let token = req.header("x-access-token");

  //
  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err) {
    
      res.status(401).send(err);
    } else {
      
      req.user_id = decoded._id;
      next();
    }
  });


  let refreshToken = req.header("x-refresh-token");

  let _id = req.header("_id");

  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        return Promise.reject({
          error:
            "User not found. Make sure that the refresh token and user id are correct",
        });
      }

      req.user_id = user._id;
      req.userObject = user;
      req.refreshToken = refreshToken;

      let isSessionValid = false;

      user.sessions.forEach((session) => {
        if (session.token === refreshToken) {
          if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
            isSessionValid = true;
          }
        }
      });

      if (isSessionValid) {
        next();
      } else {
        return Promise.reject({
          error: "Refresh token has expired or the session is invalid",
        });
      }
    })
    .catch((e) => {
      res.status(401).send(e);
    });
};

router.get("/:id", function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  const id = req.params.id;
  User.findOne({ _id: req.params.id, _userId: req.user_id }).then(function (
    list
  ) {
    res.send(list);
  });
});
// router.get('/username', verifySession, (req, res, next) => {
//     return res.status(200).json({ firstName: decodedToken.firstName, _id: decodedToken._id });
//   })

router.put("/me/access-token", verifySession, (req, res) => {
  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      res.header("x-access-token", accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

module.exports = router;