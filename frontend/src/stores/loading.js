import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoadingStore = defineStore('loading', () => {
    const count = ref(0)
    const visible = ref(false)

    let timer = null
    const DELAY = 400

    const start = () => {
        count.value++

        if (timer) return

        timer = setTimeout(() => {
            if (count.value > 0) {
                visible.value = true
            }
        }, DELAY)
    }

    const end = () => {
        count.value = Math.max(0, count.value - 1)

        if (count.value === 0) {
            clearTimeout(timer)
            timer = null
            visible.value = false
        }
    }

    const reset = () => {
        count.value = 0
        clearTimeout(timer)
        timer = null
        visible.value = false
    }

    return {
        visible,
        start,
        end,
        reset,
    }
})
