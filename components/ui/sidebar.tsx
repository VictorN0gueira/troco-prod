import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../utils";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);
    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<"div">) => {
    return (
        <>
            <DesktopSidebar {...(props as any)} />
            <MobileSidebar {...(props as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div>) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <motion.div
            className={cn(
                "h-full px-4 py-4 hidden lg:flex lg:flex-col bg-white dark:bg-slate-900 w-[280px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 z-50",
                className
            )}
            animate={{
                width: animate ? (open ? "280px" : "68px") : "280px",
            }}
            initial={{ width: "68px" }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <div
            className={cn(
                "h-16 px-4 flex flex-row lg:hidden items-center justify-between bg-white dark:bg-slate-900 w-full z-50 border-b border-slate-200 dark:border-slate-800"
            )}
            {...props}
        >
            <div className="flex justify-start z-20 w-full">
                <Menu
                    className="text-slate-800 dark:text-slate-200 w-6 h-6 cursor-pointer"
                    onClick={() => setOpen(!open)}
                />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-100%", opacity: 0 }}
                        transition={{
                            duration: 0.3,
                            ease: "easeInOut",
                        }}
                        className={cn(
                            "fixed h-full w-full inset-0 bg-white dark:bg-slate-900 p-6 z-[100] flex flex-col justify-between overflow-y-auto",
                            className
                        )}
                    >
                        <div
                            className="absolute right-6 top-6 z-50 text-slate-800 dark:text-slate-200 cursor-pointer p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setOpen(!open)}
                        >
                            <X className="w-6 h-6" />
                        </div>
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const SidebarLink = ({
    link,
    className,
    ...props
}: {
    link: Links;
    className?: string;
    onClick?: () => void;
}) => {
    const { open, animate, setOpen } = useSidebar();
    return (
        <NavLink
            to={link.href}
            onClick={() => {
                if (window.innerWidth < 1024) setOpen(false);
                if (props.onClick) props.onClick();
            }}
            className={({ isActive }) => cn(
                "flex items-center justify-start gap-4 group/sidebar py-2 px-2 rounded-lg transition-all duration-300",
                isActive ? "bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold" : "text-slate-500 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800/50",
                className
            )}
        >
            {link.icon}
            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="font-medium text-sm sm:text-base group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
            >
                {link.label}
            </motion.span>
        </NavLink>
    );
};
