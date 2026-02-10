<template>
  <Transition name="toast-fade">
    <div
      v-if="toastStore.isVisible"
      class="toast-container"
      :class="toastStore.type"
    >
      <div class="toast-content">
        <span class="icon" v-if="toastStore.type === 'error'">
             <!-- Error Icon (Exclamation Circle) -->
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <span class="icon" v-else-if="toastStore.type === 'success'">
            <!-- Success Icon (Check Circle) -->
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
         <span class="icon" v-else>
            <!-- Info Icon -->
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
         </span>
        <span class="message">{{ toastStore.message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useToastStore } from '@/stores/toastStore';

const toastStore = useToastStore();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  min-width: 300px;
  max-width: 80%;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.message {
    font-size: 14px;
    font-weight: 500;
}

/* Error Style */
.toast-container.error {
  background-color: #FEF2F2; /* Red 50 */
  border: 1px solid #FECACA; /* Red 200 */
  color: #991B1B; /* Red 800 */
}
.toast-container.error .icon {
    color: #DC2626; /* Red 600 */
}

/* Success Style */
.toast-container.success {
  background-color: #ECFDF5; /* Green 50 */
  border: 1px solid #A7F3D0; /* Green 200 */
  color: #065F46; /* Green 800 */
}
.toast-container.success .icon {
    color: #059669; /* Green 600 */
}

/* Info/Warning Style */
.toast-container.info,
.toast-container.warning {
  background-color: #EFF6FF; /* Blue 50 */
  border: 1px solid #BFDBFE; /* Blue 200 */
  color: #1E40AF; /* Blue 800 */
}
.toast-container.info .icon,
.toast-container.warning .icon {
    color: #2563EB; /* Blue 600 */
}


/* Animations */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
