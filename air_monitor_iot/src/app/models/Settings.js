import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    pm25: { type: Number, default: 50 },
    gas: { type: Number, default: 70 },
    tempMax: { type: Number, default: 35 },
    tempMin: { type: Number, default: 18 },
    humMax: { type: Number, default: 70 },
    humMin: { type: Number, default: 30 },
    buzzerEnabled: { type: Boolean, default: true }
});

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);