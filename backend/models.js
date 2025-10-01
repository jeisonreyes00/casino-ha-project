import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 32 },
  balance: { type: Schema.Types.Decimal128, required: true, default: () => mongoose.Types.Decimal128.fromString("0") },
  createdAt: { type: Date, required: true, default: Date.now }
}, { timestamps: false });

const RoundSchema = new Schema({
  code: { type: String, required: true, unique: true },
  state: { type: String, enum: ["open","closed","settled"], required: true, default: "open" },
  crashMultiplier: { type: Schema.Types.Decimal128 },
  openedAt: { type: Date, required: true, default: Date.now },
  closedAt: { type: Date }
});

const BetSchema = new Schema({
  user: { type: String, required: true },
  amount: { type: Schema.Types.Decimal128, required: true },
  round: { type: String, required: true },
  status: { type: String, enum: ["placed","won","lost","cashout"], required: true, default: "placed" },
  payout: { type: Schema.Types.Decimal128 },
  createdAt: { type: Date, required: true, default: Date.now }
});

export default function models(conn) {
  return {
    User: conn.model("User", UserSchema, "users"),
    Round: conn.model("Round", RoundSchema, "rounds"),
    Bet: conn.model("Bet", BetSchema, "bets")
  };
}
