import { useEffect, useRef, useState } from 'react'

const useIntersectionObserver = (options) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            options
        );

        const currentRef = ref.current;

        if (currentRef) {
            observer.observe(currentRef);
        }
        
        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [options])

    return [ref, isVisible]
}

export default useIntersectionObserver