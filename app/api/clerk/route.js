import { Webhook } from "svix";
import User from "@/models/User";
import connectDB from "@/config/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req) {
  console.log("Received webhook");

  const wh = new Webhook(process.env.SIGNING_SECRET);
  const headerPayload = headers();

  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id"),
    "svix-timestamp": headerPayload.get("svix-timestamp"),
    "svix-signature": headerPayload.get("svix-signature"),
  };

  let body;
  try {
    const payload = await req.json();
    body = JSON.stringify(payload);
    console.log("Webhook body:", payload);
  } catch (err) {
    console.error("Invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let event;
  try {
    event = wh.verify(body, svixHeaders);
    console.log("Webhook verified:", event.type);
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { data, type } = event;

  const userData = {
    _id: data.id,
    email: data.email_addresses?.[0]?.email_address || "",
    name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
    image: data.image_url ?? "",
  };

  try {
    await connectDB();
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    return NextResponse.json({ error: "MongoDB connect error" }, { status: 500 });
  }

  try {
    switch (type) {
      case "user.created":
        await User.create(userData);
        console.log("User created:", userData);
        break;
      case "user.updated":
        await User.findByIdAndUpdate(data.id, userData);
        console.log("User updated:", userData);
        break;
      case "user.deleted":
        await User.findByIdAndDelete(data.id);
        console.log("User deleted:", data.id);
        break;
      default:
        console.log("Unhandled webhook type:", type);
        break;
    }
  } catch (err) {
    console.error("MongoDB operation failed:", err);
    return NextResponse.json({ error: "MongoDB operation failed" }, { status: 500 });
  }

  return NextResponse.json({ message: "Event received" });
}
