import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
    sensor: String,
    value: Number,
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);