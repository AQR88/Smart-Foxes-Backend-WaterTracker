import bcrypt from "bcrypt";
import { User } from "../models/userModels.js";
//import fs from "fs/promises";
import HttpError from "../helpers/HttpError.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import Jimp from "jimp";
import * as crypto from "node:crypto";

const avatarsDir = path.join(process.cwd(), "public/avatars");

export const getCurrentUser = (req, res) => {
  const { email, avatarURL = null, gender, waterRate, name = "" } = req.user;
  res.json({
    email,
    avatarURL,
    gender,
    waterRate,
    name,
  });
};

export const updateInfoUser = async (req, res, next) => {
  try {
    console.log(req.body);
    const { password, newPassword } = req.body;

    if (!newPassword) {
      throw HttpError(400, "New password not found");
    }
    if (password === newPassword) {
      throw HttpError(
        400,
        "The new password must be different from the old password"
      );
    }
    const passwordCompare = await bcrypt.compare(password, req.user.password);
    if (!passwordCompare) {
      throw HttpError(401, "Old password is wrong");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    if (!newPasswordHash) {
      throw HttpError(400);
    }

    /* думаю, що перевірка на email, взагалі не потрібна, всеодно в  findByIdAndUpdate передаємо весь body*/
    /*const { _id, currentEmail } = req.user;
    
      if (newEmail && newEmail !== currentEmail) {
      const userChangeEmail = await User.findOne({ email: newEmail });

      if (userChangeEmail) {
        throw HttpError(409, "Email is already in use");
      }
    } */
    const { name, email, password: newPassword, gender } = req.body;

    const user = await User.findByIdAndUpdate(req.user._id, req.body, {
      new: true,
    });
    /* 
    const { name = "", gender, email } = user; */
    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatarUser = async (req, res, next) => {
  try {
    if (!req.file) {
      throw HttpError(400, "Avatar must be provided");
    }
    const { _id } = req.user;
    const { path: tmpUpload, originalname } = req.file;
    if (!req.user) {
      throw HttpError(401, { message: "Not authorized" });
    }
    await Jimp.read(tmpUpload)
      .then((avatar) => {
        return avatar.resize(250, 250).quality(60).write(tmpUpload);
      })
      .catch((error) => {
        throw error;
      });
    const prefix = crypto.randomUUID();
    const fileName = `${prefix}_${_id}_${originalname}`;
    const publicUpload = path.join(avatarsDir, fileName);
    await fs.rename(tmpUpload, publicUpload);
    const avatarURL = path.join("avatars", fileName);
    await User.findByIdAndUpdate(_id, { avatarURL });
    res.json({
      avatarURL,
    });
  } catch (error) {
    next(error);
  }
};
