"use server";

import { db } from "@/lib/db"; // Ensure this matches your db.ts path
import bcrypt from "bcryptjs";

export async function registerUser(data: any) {
  const { fullName, email, password, surveyorId, targetState } = data;

  if (!fullName || !email || !password) return { error: "Missing required fields." };

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) return { error: "User already exists with this email." };

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        surveyorId,
        targetState,
        role: "SURVEYOR",
      },
    });

    return { success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } };
  } catch (error) {
    return { error: "Failed to create account." };
  }
}

export async function loginUser(data: any) {
  const { email, password } = data;

  if (!email || !password) return { error: "Missing required fields." };

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return { error: "Invalid email or password." };

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return { error: "Invalid email or password." };

    return { success: true, user: { name: user.name, email: user.email, role: user.role } };
  } catch (error) {
    return { error: "Something went wrong." };
  }
}