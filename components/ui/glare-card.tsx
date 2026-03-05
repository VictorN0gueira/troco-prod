import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils";

export const GlareCard = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const isPointerInside = useRef(false);
    const refElement = useRef<HTMLDivElement>(null);
    const [state, setState] = useState({
        glare: { x: 50, y: 50, opacity: 0 },
        background: { x: 50, y: 50 },
        rotate: { x: 0, y: 0 },
    });

    const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
        isPointerInside.current = true;
        if (!refElement.current) return;
        const rect = refElement.current.getBoundingClientRect();
        const position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
        const percentage = {
            x: (100 / rect.width) * position.x,
            y: (100 / rect.height) * position.y,
        };
        const rotate = {
            x: ((percentage.y - 50) / 50) * -10,
            y: ((percentage.x - 50) / 50) * 10,
        };

        setState({
            glare: { x: percentage.x, y: percentage.y, opacity: 1 },
            background: { x: percentage.x, y: percentage.y },
            rotate: { x: rotate.x, y: rotate.y },
        });
    };

    const resetPointer = () => {
        isPointerInside.current = false;
        setState({
            glare: { x: 50, y: 50, opacity: 0 },
            background: { x: 50, y: 50 },
            rotate: { x: 0, y: 0 },
        });
    };

    return (
        <div
            className={cn("relative isolate [contain:layout_style]", className)}
            style={{
                perspective: "600px",
            }}
        >
            <motion.div
                ref={refElement}
                onPointerMove={updatePointer}
                onPointerLeave={resetPointer}
                onPointerEnter={updatePointer}
                animate={{
                    rotateX: state.rotate.x,
                    rotateY: state.rotate.y,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full h-full transform-gpu relative [transform-style:preserve-3d] will-change-transform"
            >
                <div className="w-full h-full relative z-10">{children}</div>

                {/* Glare Wrapper */}
                <motion.div
                    className="absolute inset-0 z-50 overflow-hidden rounded-2xl pointer-events-none mix-blend-overlay opacity-0 transition-opacity duration-500"
                    animate={{ opacity: state.glare.opacity }}
                >
                    {/* Glare */}
                    <div
                        className="absolute inset-0 opacity-20 will-change-transform"
                        style={{
                            background: `radial-gradient(farthest-corner circle at ${state.glare.x}% ${state.glare.y}%, rgba(255, 255, 255, 0.8) 10%, rgba(255, 255, 255, 0.1) 20%, rgba(0, 0, 0, 0) 90%)`,
                            transform: "scale(1.5)",
                        }}
                    />
                </motion.div>
            </motion.div>
        </div>
    );
};
