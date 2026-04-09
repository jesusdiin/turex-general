import { onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useScrollAnimation() {
  function fadeInUp(selector: string, trigger?: string) {
    gsap.from(selector, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: trigger ?? selector,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    })
  }

  function staggerCards(selector: string, trigger?: string) {
    gsap.from(selector, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: trigger ?? selector,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    })
  }

  function parallax(selector: string, speed = 0.5) {
    gsap.to(selector, {
      yPercent: speed * 30,
      ease: 'none',
      scrollTrigger: {
        trigger: selector,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })
  }

  function countUp(selector: string, target: number) {
    const obj = { val: 0 }
    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: selector,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      onUpdate() {
        const el = document.querySelector(selector)
        if (el) el.textContent = Math.round(obj.val).toLocaleString()
      },
    })
  }

  onUnmounted(() => {
    ScrollTrigger.getAll().forEach((t) => t.kill())
  })

  return { fadeInUp, staggerCards, parallax, countUp }
}
