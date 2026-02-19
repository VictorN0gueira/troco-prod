const key = "BBWYxTTr81JGNbpZTeN66V3kGAUpu-ibcNlcYVwiud6vV4IhQPKNsvG8RhydTl7EwPhf-bbznCXT2kbMgWpjvEl8";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

try {
    const decoded = urlBase64ToUint8Array(key);
    console.log("Decoded length:", decoded.length);
    if (decoded.length !== 65) {
        console.error("Invalid length! Expected 65 bytes (0x04 + 32 + 32).");
    } else {
        console.log("Key looks valid (65 bytes).");
        if (decoded[0] !== 0x04) {
            console.error("Invalid start byte! Expected 0x04 (uncompressed). Got:", decoded[0]);
        } else {
            console.log("Start byte is valid (0x04).");
        }
    }
} catch (e) {
    console.error("Error decoding:", e.message);
}
