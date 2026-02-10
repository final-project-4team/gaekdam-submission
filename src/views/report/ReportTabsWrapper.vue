<template>
    <div class="tabs-wrap">
        <ContentTabs :tabs="tabs" />
        <BaseButton @click="openCreate" size="sm">+</BaseButton>

        <BaseModal v-if="showCreate" title="레이아웃 추가" @close="showCreate=false">
            <div>
                <input v-model="newLabel" placeholder="레이아웃 이름" />
                <div style="margin-top:12px; text-align:right">
                    <BaseButton @click="create" type="primary">생성</BaseButton>
                </div>
            </div>
        </BaseModal>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ContentTabs from '@/components/layoutComponents/ContentTabs.vue'
import BaseButton from '@/components/common/button/BaseButton.vue'
import BaseModal from '@/components/common/modal/BaseModal.vue'

const router = useRouter()

const tabs = ref([
  { label: '빈탭', path: '/report/empty' },
])

const showCreate = ref(false)
const newLabel = ref('')

const openCreate = () => { newLabel.value = ''; showCreate.value = true }

const create = () => {
  const id = Date.now()
  const path = `/report/layout/${id}`
  tabs.value.push({ label: newLabel.value || `레이아웃 ${tabs.value.length+1}`, path })
  showCreate.value = false
  router.push(path) // 새로 생성된 레이아웃으로 이동
}
</script>

<style scoped>
.tabs-wrap { display:flex; align-items:center; gap:12px; padding-right:12px; }
</style>