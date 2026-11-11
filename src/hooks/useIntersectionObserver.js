import { useRef } from 'react'

/* The landing sections are complete at rest (Apple review S5 / F3, inbox 569).
   This hook used to report `entry.isIntersecting`, so every section faded in
   when it reached the screen and hid again when it left. The section replayed
   on every scroll, and anything that captures the whole page at once (a link
   preview, a screenshot, print) drew blank bands under the hero at both widths.

   It now answers "visible" from the first render, on the server too, so the
   sections are there before any script runs. The signature is kept so the
   seven landing sections that read it did not have to change. */
const useIntersectionObserver = () => {
    const ref = useRef(null);
    return [ref, true]
}

export default useIntersectionObserver
