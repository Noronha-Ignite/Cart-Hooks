import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => Promise<void>;
}

const localStorageKey = '@RocketShoes:cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(getProductsInLocalStorage);

  function getProductsInLocalStorage(): Product[] {
    const storagedCart = localStorage.getItem(localStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  };

  const addProduct = async (productId: number) => {
    try {
      if ( cart.some(cartProduct => cartProduct.id === productId )) {
        const productAmount = cart.find(product => product.id === productId)!.amount;

        return await updateProductAmount({ productId: productId, amount: productAmount + 1 });
      }

      const { data: stock } = await api.get<Stock>(`/stock/${ productId }`);

      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data: product } = await api.get<Omit<Product, 'amount'>>(`/products/${ productId }`);

      const newCart = [...cart, { ...product, amount: 1 }]

      setCart(newCart);
      localStorage.setItem(localStorageKey, JSON.stringify(newCart));
    } catch(err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(product => product.id === productId)) throw new Error();

      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem(localStorageKey, JSON.stringify(newCart));
    } catch(err) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const product = cart.find(product => product.id === productId);

      if (!product) throw new Error();

      const { data: stock } = await api.get<Stock>(`/stock/${ productId }`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(cartProduct => {
        if (cartProduct.id !== product.id) return cartProduct;

        return {
          ...product,
          amount
        };
      });

      setCart(newCart);
      localStorage.setItem(localStorageKey, JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
