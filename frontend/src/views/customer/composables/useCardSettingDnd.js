// src/views/customer/composables/useCardSettingDnd.js
import { computed, ref } from "vue";

/**
 * @param {object} args
 * @param {string} args.lsKey
 * @param {function} args.defaultCardSetting  () => cardSetting[]
 */
export function useCardSettingDnd({ lsKey, defaultCardSetting }) {
    const showCardSettingModal = ref(false);

    const normalizeCardSetting = (list) => {
        const arr = Array.isArray(list) ? list : [];
        const left = arr.filter((x) => x.column === "left");
        const right = arr.filter((x) => x.column === "right");

        const fix = (items) => {
            const hasOrder = items.every((x) => typeof x.order === "number");
            if (hasOrder) return items;

            return items.map((x, idx) => ({
                ...x,
                order: typeof x.order === "number" ? x.order : idx + 1,
            }));
        };

        return [...fix(left), ...fix(right)];
    };

    const cardSettings = ref(defaultCardSetting());

    const loadCardSetting = () => {
        try {
            const raw = localStorage.getItem(lsKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
                cardSettings.value = normalizeCardSetting(parsed);
            }
        } catch (e) { }
    };
    loadCardSetting();

    const cardSettingsDraft = ref(JSON.parse(JSON.stringify(cardSettings.value)));

    const leftCards = computed(() =>
        cardSettings.value
            .filter((c) => c.enabled && c.column === "left")
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    );

    const rightCards = computed(() =>
        cardSettings.value
            .filter((c) => c.enabled && c.column === "right")
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    );

    const draftLeft = computed(() =>
        cardSettingsDraft.value
            .filter((c) => c.column === "left")
            .slice()
            .sort((a, b) => {
                if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
                return (a.order ?? 999) - (b.order ?? 999);
            })
    );

    const draftRight = computed(() =>
        cardSettingsDraft.value
            .filter((c) => c.column === "right")
            .slice()
            .sort((a, b) => {
                if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
                return (a.order ?? 999) - (b.order ?? 999);
            })
    );

    const reflowColumn = (column) => {
        const list = cardSettingsDraft.value
            .filter((x) => x.column === column)
            .slice()
            .sort((a, b) => {
                if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
                return (a.order ?? 999) - (b.order ?? 999);
            });

        list.forEach((item, idx) => {
            item.order = idx + 1;
        });
    };

    const onToggleEnabled = (column) => {
        reflowColumn(column);
    };

    const onCardSetting = () => {
        cardSettingsDraft.value = JSON.parse(JSON.stringify(cardSettings.value));
        reflowColumn("left");
        reflowColumn("right");
        showCardSettingModal.value = true;
    };

    const saveCardSetting = () => {
        cardSettings.value = normalizeCardSetting(JSON.parse(JSON.stringify(cardSettingsDraft.value)));
        localStorage.setItem(lsKey, JSON.stringify(cardSettings.value));
        showCardSettingModal.value = false;
    };

    const resetCardSetting = () => {
        cardSettingsDraft.value = defaultCardSetting();
        reflowColumn("left");
        reflowColumn("right");
    };

    /* =========================
       drag UX
       ========================= */
    const dragState = ref({ id: null, column: null });
    const overState = ref({ column: null, index: null });

    const isOver = (column, index) => {
        return dragState.value.id && overState.value.column === column && overState.value.index === index;
    };

    const showIndicator = (column, index) => {
        if (!dragState.value.id) return false;
        return isOver(column, index);
    };

    const createDragGhost = (e) => {
        try {
            const target = e.currentTarget;
            if (!target) return;

            const ghost = target.cloneNode(true);
            ghost.classList.add("drag-ghost");
            // Basic styles to ensure visibility
            ghost.style.position = 'absolute';
            ghost.style.top = '-9999px';
            ghost.style.width = `${target.getBoundingClientRect().width}px`;
            ghost.style.opacity = '1';
            ghost.style.background = '#fff';
            document.body.appendChild(ghost);

            const rect = target.getBoundingClientRect();
            // Center the grab point roughly
            const offsetX = rect.width / 2;
            const offsetY = rect.height / 2;

            e.dataTransfer.setDragImage(ghost, offsetX, offsetY);

            setTimeout(() => {
                if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
            }, 0);
        } catch (_) { }
    };

    const onDragStart = (e, id, column) => {
        dragState.value = { id, column };
        overState.value = { column, index: null };

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.dropEffect = "move";
        e.dataTransfer.setData("text/plain", String(id));
        createDragGhost(e);
    };

    // simplified - no op, using dragOver instead
    const onDragEnter = (column, index) => { };

    const onDragOver = (column, index) => {
        if (!dragState.value.id || dragState.value.column !== column) return;

        // Critical for performance: do not update if same
        if (overState.value.column === column && overState.value.index === index) return;

        overState.value = { column, index };
    };

    const onDragLeave = (column, index) => {
        // Removed to prevent flickering when moving between items
    };

    const applyOrder = (orderedList) => {
        orderedList.forEach((item, idx) => {
            item.order = idx + 1;
        });
    };

    const onDropAt = (column, targetIndex) => {
        const { id: dragId, column: dragCol } = dragState.value;
        if (!dragId || dragCol !== column) return;

        const list = (column === "left" ? draftLeft.value : draftRight.value).slice();
        const fromIndex = list.findIndex((x) => x.id === dragId);
        if (fromIndex < 0) return;

        const toIndex = Math.max(0, Math.min(targetIndex, list.length));

        // If dropping on itself or same position, just reset
        if (fromIndex === toIndex || fromIndex === toIndex - 1) {
            onDragEnd();
            return;
        }

        const [moved] = list.splice(fromIndex, 1);

        // Simplified Logic:
        // We are dropping at 'toIndex'.
        // If fromIndex < toIndex, we need to adjust because removal of 'from' shifted indices down.
        const insertionIndex = (fromIndex < toIndex) ? toIndex - 1 : toIndex;

        list.splice(insertionIndex, 0, moved);

        // Re-assign to main list
        applyOrder(list);

        // Now update cardSettingsDraft items to match these new orders
        list.forEach(item => {
            const found = cardSettingsDraft.value.find(x => x.id === item.id);
            if (found) found.order = item.order;
        });

        reflowColumn(column); // re-sorts just in case

        onDragEnd();
    };

    const onDragEnd = () => {
        dragState.value = { id: null, column: null };
        overState.value = { column: null, index: null };
    };

    return {
        // modal
        showCardSettingModal,
        onCardSetting,
        saveCardSetting,
        resetCardSetting,

        // render lists
        leftCards,
        rightCards,
        draftLeft,
        draftRight,
        cardSettingsDraft,

        // toggle
        onToggleEnabled,

        // dnd
        dragState,
        isOver,
        showIndicator,
        onDragStart,
        onDragEnter,
        onDragOver,
        onDragLeave,
        onDropAt,
        onDragEnd,
    };
}
