import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
    const isVisible = ref(false);
    const message = ref('');
    const type = ref('error'); // 'error', 'success', 'info', 'warning'

    let timer = null;

    const showToast = (msg, msgType = 'error', duration = 3000) => {
        message.value = msg;
        type.value = msgType;
        isVisible.value = true;

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            hideToast();
        }, duration);
    };

    const hideToast = () => {
        isVisible.value = false;
        // Optional: clear message after animation
        setTimeout(() => {
            message.value = '';
        }, 300); // Wait for transition
    };

    return {
        isVisible,
        message,
        type,
        showToast,
        hideToast
    };
});
