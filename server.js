const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

const PORT = process.env.PORT || 10000;

// FIXED: Reads your dedicated Ethereum Sepolia node link directly with zero string splitting hacks!
const ETH_SEPOLIA_RPC = process.env.ETH_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(ETH_SEPOLIA_RPC);
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

let devWallet = null;
if (PRIVATE_KEY) {
    try {
        devWallet = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log(`📡 [Direct Refuel Engaged]: Operational wallet ready: ${devWallet.address}`);
    } catch (e) {
        console.log("⚠️ Wallet initialization failed.");
    }
}

app.get('/', (req, res) => {
    res.json({ status: "online", message: "PennyGas 1-Wallet Engine Live!" });
});

app.post('/api/submit-permit', async (req, res) => {
    try {
        const { owner } = req.body;
        console.log(`\n🚀 [Incoming Request]: Valid request captured from user: ${owner}`);
        
        if (!devWallet) {
            return res.status(500).json({ success: false, error: "Backend wallet uninitialized" });
        }

        console.log(`🔒 Initializing DIRECT wallet-to-wallet transfer from your funded account to: ${owner}`);
        
        // Physically send 0.005 ETH straight out of your personal testnet balance to the user
        const tx = await devWallet.sendTransaction({
            to: owner,
            value: ethers.parseEther("0.005")
        });

        console.log(`⏳ Broadcasted! Receipt Hash: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Refuel complete! User successfully funded.`);

        res.json({ 
            success: true, 
            message: "Refuel processed directly between wallets!",
            transactionHash: tx.hash
        });

    } catch (err) {
        console.error("❌ Transfer exception:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`PennyGas Server listening on port ${PORT}`);
});
