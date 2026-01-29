const app = require("./app");

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("TapTable Backend is running");
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TapTable Backend running on port ${PORT}`);
});
