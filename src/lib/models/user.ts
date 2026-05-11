import mongoose, { Schema, type Document } from "mongoose";

export interface IJob {
  name: string;
  hourlyRate: number;
  weeklyTarget: number;
  active: boolean;
  enableExpenseTracking: boolean;
}

export interface IBill {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  active: boolean;
}

export interface ISubject {
  name: string;
  color: string;
  active: boolean;
}

export interface IHobby {
  name: string;
  color: string;
  active: boolean;
}

export interface IChore {
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  active: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  provider: "credentials" | "google";
  avatarEmoji: string;
  onboardingDone: boolean;
  enabledSections: string[];
  preferences: {
    accentTheme: string;
    fontStyle: string;
    layoutDensity: string;
    currency: string;
    weekStart: string;
    dateFormat: string;
    timeFormat: string;
  };
  workConfig: {
    jobs: IJob[];
    gasPrice: number;
    carConsumption: number;
  };
  studyConfig: {
    subjects: ISubject[];
  };
  hobbiesConfig: {
    hobbies: IHobby[];
  };
  houseworkConfig: {
    chores: IChore[];
  };
  bills: IBill[];
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    name: { type: String, required: true },
    hourlyRate: { type: Number, default: 0 },
    weeklyTarget: { type: Number, default: 20 },
    active: { type: Boolean, default: true },
    enableExpenseTracking: { type: Boolean, default: false },
  },
  { _id: true }
);

const BillSchema = new Schema<IBill>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDay: { type: Number, min: 1, max: 31 },
    category: {
      type: String,
      enum: ["rent", "utilities", "subscriptions", "insurance", "other"],
      default: "other",
    },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    image: { type: String },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    avatarEmoji: { type: String, default: "🌟" },
    onboardingDone: { type: Boolean, default: false },
    enabledSections: {
      type: [String],
      enum: [
        "work", "gym", "finances", "habits", "study",
        "hobbies", "housework", "health", "goals", "reading", "journal", "shopping", "mealprep",
      ],
      default: ["work", "gym", "finances", "habits"],
    },
    preferences: {
      accentTheme: {
        type: String,
        enum: ["amber", "teal", "violet", "rose", "sage", "ocean", "sunset"],
        default: "amber",
      },
      fontStyle: {
        type: String,
        enum: ["sans", "inter", "geometric", "serif", "mono"],
        default: "sans",
      },
      layoutDensity: {
        type: String,
        enum: ["compact", "default", "spacious"],
        default: "default",
      },
      currency: {
        type: String,
        enum: ["CAD", "USD", "EUR", "GBP"],
        default: "CAD",
      },
      weekStart: {
        type: String,
        enum: ["monday", "sunday"],
        default: "monday",
      },
      dateFormat: {
        type: String,
        enum: ["MMM d, yyyy", "d MMM yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy"],
        default: "MMM d, yyyy",
      },
      timeFormat: {
        type: String,
        enum: ["24h", "12h"],
        default: "24h",
      },
    },
    workConfig: {
      jobs: { type: [JobSchema], default: [] },
      gasPrice: { type: Number, default: 210.2 },
      carConsumption: { type: Number, default: 9.0 },
    },
    studyConfig: {
      subjects: {
        type: [
          {
            name: { type: String, required: true },
            color: { type: String, default: "#D4A853" },
            active: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },
    hobbiesConfig: {
      hobbies: {
        type: [
          {
            name: { type: String, required: true },
            color: { type: String, default: "#D4A853" },
            active: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },
    houseworkConfig: {
      chores: {
        type: [
          {
            name: { type: String, required: true },
            frequency: {
              type: String,
              enum: ["daily", "weekly", "monthly"],
              default: "daily",
            },
            active: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },
    bills: { type: [BillSchema], default: [] },
  },
  { timestamps: true }
);

if (mongoose.models.User) mongoose.deleteModel("User");
export default mongoose.model<IUser>("User", UserSchema);
