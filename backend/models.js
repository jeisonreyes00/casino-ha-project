import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 32 },
  balance:  { type: Schema.Types.Decimal128, required: true, default: () => mongoose.Types.Decimal128.fromString("0") },
  sessionEndAt: { type: Date },                      // ← usado por ensureSession
  createdAt: { type: Date, required: true, default: Date.now }
}, { timestamps: false });

const RoundSchema = new Schema({
  code: { type: String, required: true, unique: true },
  phase: { type: String, enum: ["betting","flying","crashed","closed"], required: true, default: "betting" },
  crashMultiplier: { type: Schema.Types.Decimal128 },
  openedAt: { type: Date, required: true, default: Date.now },
  bettingEndsAt: { type: Date },
  crashedAt: { type: Date },
  closedAt: { type: Date }
});

const BetSchema = new Schema({
  user: { type: String, required: true },
  amount: { type: Schema.Types.Decimal128, required: true },
  roundCode: { type: String, required: true },       // ← coincide con el server
  status: { type: String, enum: ["placed","cashed","lost"], required: true, default: "placed" },
  cashoutMultiplier: { type: Schema.Types.Decimal128 },
  payout: { type: Schema.Types.Decimal128 },
  createdAt: { type: Date, required: true, default: Date.now }
});

BetSchema.index({ roundCode: 1, createdAt: -1 });
BetSchema.index({ status: 1, createdAt: -1 });

export default function models(conn) {
  return {
    User:  conn.model("User",  UserSchema,  "users"),
    Round: conn.model("Round", RoundSchema, "rounds"),
    Bet:   conn.model("Bet",   BetSchema,   "bets")
  };
}
