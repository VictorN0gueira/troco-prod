import { useEffect, useRef } from "react";
import { useInView, useMotionValue, animate } from "framer-motion";
import { cn } from "../../utils";

type NumberTickerProps = {
    value: number;
    direction?: "up" | "down";
    className?: string;
    delay?: number;
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
    isCurrency?: boolean;
};

export default function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
    decimalPlaces = 0,
    prefix = "",
    suffix = "",
    isCurrency = false,
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const isInView = useInView(ref, { once: true, margin: "0px" });
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (isInView && !hasAnimated.current) {
            hasAnimated.current = true;
            setTimeout(() => {
                animate(motionValue, value, {
                    type: "tween",
                    duration: 1.2, // Fixed fast duration regardless of number size
                    ease: "easeOut",
                });
            }, delay * 1000);
        } else if (hasAnimated.current) {
            // Se o valor atualizar (ex: nova transação), anima para o novo valor rapidamente
            animate(motionValue, value, {
                type: "tween",
                duration: 0.8,
                ease: "easeOut",
            });
        }
    }, [motionValue, isInView, delay, value, direction]);

    useEffect(() => {
        return motionValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = `${prefix}${Intl.NumberFormat("pt-BR", {
                    minimumFractionDigits: decimalPlaces,
                    maximumFractionDigits: decimalPlaces,
                }).format(Number(latest.toFixed(decimalPlaces)))}${suffix}`;
            }
        });
    }, [motionValue, decimalPlaces, prefix, suffix, isCurrency]);

    return (
        <span
            className={cn(
                "inline-block tabular-nums tracking-wider",
                className
            )}
            ref={ref}
        />
    );
}
