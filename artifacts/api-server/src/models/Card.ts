import mongoose, { Schema } from "mongoose";

const SideSchema = new Schema(
  {
    name: { type: String, default: "" },
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    phone: { type: [String], default: [] },
    email: { type: [String], default: [] },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    qrData: { type: [String], default: [] },
  },
  { _id: false },
);

const CardSchema: Schema = new Schema({
  front: { type: SideSchema, default: () => ({}) },
  back: { type: SideSchema, default: () => ({}) },
  category: { type: String, default: "" },
  isTranslated: { type: Boolean, default: false },
  originalLanguage: { type: String, default: "" },
  translationNote: { type: String, default: "" },
  frontImageUrl: { type: String, required: true },
  backImageUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Card || mongoose.model("Card", CardSchema);
