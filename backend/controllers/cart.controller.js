import Product from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
	try {
		if (!req.user.cartItems || req.user.cartItems.length === 0) {
			return res.json([]);
		}

		const products = await Product.find({ _id: { $in: req.user.cartItems.map((item) => item.product) } });

		// add quantity for each product
		const cartItems = products.map((product) => {
			const item = req.user.cartItems.find((cartItem) => cartItem.product.toString() === product._id.toString());
			return { ...product.toJSON(), quantity: item ? item.quantity : 1 };
		});

		res.json(cartItems);
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;

		if (!user.cartItems) {
			user.cartItems = [];
		}

		const existingItem = user.cartItems.find((item) => item.product.toString() === productId);
		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			user.cartItems.push({ product: productId, quantity: 1 });
		}

		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;
		
		if (!user.cartItems) {
			user.cartItems = [];
		}
		
		if (!productId) {
			user.cartItems = [];
		} else {
			user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId);
		}
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in removeAllFromCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		const { id: productId } = req.params;
		const { quantity } = req.body;
		const user = req.user;
		const existingItem = user.cartItems.find((item) => item.product.toString() === productId);

		if (existingItem) {
			if (quantity === 0) {
				user.cartItems = user.cartItems.filter((item) => item.product.toString() !== productId);
				await user.save();
				return res.json(user.cartItems);
			}

			existingItem.quantity = quantity;
			await user.save();
			res.json(user.cartItems);
		} else {
			res.status(404).json({ message: "Product not found in cart" });
		}
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
