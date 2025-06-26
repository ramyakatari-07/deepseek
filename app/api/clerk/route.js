import { Webhook } from "svix";
import User from "@/models/User";
import connectDB from "@/config/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req) {
  const wh = new Webhook(process.env.SIGNING_SECRET);
  const headerPayload = headers();
  const svixHeaders = {
    "svix-id": headerPayload.get("svix-id"),
    "svix-timestamp": headerPayload.get("svix-timestamp"),
    "svix-signature": headerPayload.get("svix-signature"),
  };

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let event;

  try {
    event = wh.verify(body, svixHeaders);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { data, type } = event;

  const userData = {
    _id: data.id,
    email: data.email_addresses?.[0]?.email_address,
    name: `${data.first_name} ${data.last_name}`,
    image: data.image_url,
  };

  await connectDB();

  try {
    switch (type) {
      case "user.created":
        await User.create(userData);
        break;
      case "user.updated":
        await User.findByIdAndUpdate(data.id, userData);
        break;
      case "user.deleted":
        await User.findByIdAndDelete(data.id);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("MongoDB operation failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ message: "Event received" });
}
