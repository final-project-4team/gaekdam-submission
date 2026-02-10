import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";

import TimelineAllModal from "@/views/customer/modal/TimelineAllModal.vue";

const BaseButtonStub = {
    name: "BaseButton",
    props: ["type", "size"],
    template: `<button @click="$emit('click')"><slot /></button>`,
};

const BaseModalStub = {
    name: "BaseModal",
    props: ["title"],
    emits: ["close"],
    template: `
    <div class="modal">
      <div class="title">{{ title }}</div>
      <button class="close" @click="$emit('close')">close</button>
      <div class="body"><slot /></div>
      <div class="footer"><slot name="footer" /></div>
    </div>
  `,
};

// TableWithPaging은 렌더링만 확인하면 됨(내부는 별도 컴포넌트 테스트)
const TableWithPagingStub = {
    name: "TableWithPaging",
    props: ["columns", "rows", "pageSize"],
    template: `
    <div class="table">
      <div class="rows-count">{{ rows?.length ?? 0 }}</div>
      <div class="first-row-at">{{ rows?.[0]?.at ?? "" }}</div>
    </div>
  `,
};

const flush = async () => {
    await Promise.resolve();
    await nextTick();
};

const itemsMany = (count = 35) =>
    Array.from({ length: count }, (_, i) => ({
        at: `2026-02-${String((i % 28) + 1).padStart(2, "0")} 10:00:00`,
        type: i % 2 === 0 ? "MEMO" : "RESERVATION",
        text: `text-${i + 1}`,
        refId: i + 1,
    }));

describe("TimelineAllModal", () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    const mountView = (props) =>
        mount(TimelineAllModal, {
            props,
            global: {
                stubs: {
                    BaseModal: BaseModalStub,
                    BaseButton: BaseButtonStub,
                    TableWithPaging: TableWithPagingStub,
                },
            },
        });

    it("open=false면 BaseModal 렌더링 안됨", async () => {
        const w = mountView({ open: false, items: [] });
        expect(w.find(".modal").exists()).toBe(false);
    });

    it("open=true로 열리면 watch가 reset(setQuick(12)) 실행 -> 날짜 입력값 세팅됨", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-03T12:00:00"));

        const w = mountView({ open: false, items: [] });
        expect(w.find(".modal").exists()).toBe(false);

        await w.setProps({ open: true });
        await flush();

        const dates = w.findAll('input[type="date"]');
        expect(dates).toHaveLength(2);

        // reset()이 setQuick(12)를 타면 from/to가 채워진다
        expect(dates[0].element.value).not.toBe("");
        expect(dates[1].element.value).not.toBe("");
    });

    it("items 없으면 empty 문구, items 있으면 TableWithPaging 렌더링", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-03T12:00:00"));

        const w1 = mountView({ open: true, items: [] });
        await flush();
        expect(w1.text()).toContain("타임라인 데이터가 없습니다.");
        expect(w1.find(".table").exists()).toBe(false);

        const w2 = mountView({ open: true, items: itemsMany(3) });
        await flush();
        expect(w2.find(".table").exists()).toBe(true);
        expect(w2.find(".rows-count").text()).toBe("3"); // pageSize 10이지만 3개
    });

    it("기간 필터 분기: 정상 at는 범위 필터링, NaN at는 true로 포함", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-03T12:00:00"));

        const items = [
            { at: "2026-02-01 10:00:00", type: "A", text: "in", refId: 1 },
            { at: "2026-01-01 10:00:00", type: "B", text: "out", refId: 2 },
            { at: "INVALID_DATE", type: "C", text: "nan-keep", refId: 3 },
        ];

        const w = mountView({ open: true, items });
        await flush();

        const dates = w.findAll('input[type="date"]');
        await dates[0].setValue("2026-02-01");
        await dates[1].setValue("2026-02-03");
        await flush();

        // apply는 페이지 1로만(필터는 computed라 입력만으로 반영)
        const applyBtn = w.findAll("button").find((b) => b.text().includes("적용"));
        await applyBtn.trigger("click");
        await flush();

        // 기대: 2개(in + INVALID_DATE)
        expect(w.find(".rows-count").text()).toBe("2");
    });

    it("퀵 버튼(setQuick) 클릭 -> page 1로 리셋되고 active 클래스 분기 타기", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-20T12:00:00"));

        const w = mountView({ open: true, items: itemsMany(25) });
        await flush();

        // 강제로 다음 페이지 이동(다음 버튼)
        const nextNav = w.findAll(".paging .nav").at(-2); // ›
        await nextNav.trigger("click");
        await flush();

        expect(w.find(".paging .active").text()).toBe("2");

        // 3개월 버튼 클릭 -> page=1 리셋
        const quick3 = w.findAll("button").find((b) => b.text().trim() === "3개월");
        await quick3.trigger("click");
        await flush();

        expect(w.find(".paging .active").text()).toBe("1");
    });

    it("페이지네이션 분기: prev/next, jumpPrev/jumpNext, change(같은 페이지면 noop)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-20T12:00:00"));

        // 35개면 pageSize 10 => totalPages 4
        const w = mountView({ open: true, items: itemsMany(35) });
        await flush();

        const navs = () => w.findAll(".paging .nav");
        const jumpPrev = () => navs().at(0); // «
        const prev = () => navs().at(1);     // ‹
        const next = () => navs().at(2);     // ›
        const jumpNext = () => navs().at(3); // »

        // change(1) noop 분기(현재 1인데 1 클릭)
        const page1 = w.findAll(".paging span").find((s) => s.text() === "1");
        await page1.trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("1");

        // next -> 2
        await next().trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("2");

        // prev -> 1
        await prev().trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("1");

        // jumpNext(10) => totalPages=4로 clamp
        await jumpNext().trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("4");

        // next는 disabled (page===totalPages)
        expect(next().classes()).toContain("disabled");

        // jumpPrev(10) => 1로 clamp
        await jumpPrev().trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("1");

        // prev는 disabled (page===1)
        expect(prev().classes()).toContain("disabled");
    });

    it("reset 버튼 -> setQuick(12) 타고, apply 버튼 -> page만 1로", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-20T12:00:00"));

        const w = mountView({ open: true, items: itemsMany(25) });
        await flush();

        // next로 2페이지
        const nextNav = w.findAll(".paging .nav").at(-2);
        await nextNav.trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("2");

        // apply -> page 1
        const applyBtn = w.findAll("button").find((b) => b.text().includes("적용"));
        await applyBtn.trigger("click");
        await flush();
        expect(w.find(".paging .active").text()).toBe("1");

        // reset -> setQuick(12)
        const resetBtn = w.findAll("button").find((b) => b.text().includes("초기화"));
        await resetBtn.trigger("click");
        await flush();

        const dates = w.findAll('input[type="date"]');
        expect(dates[0].element.value).not.toBe("");
        expect(dates[1].element.value).not.toBe("");
    });

    it("닫기 버튼/close 이벤트 분기", async () => {
        const w = mountView({ open: true, items: [] });
        await flush();

        // footer 닫기
        const closeBtn = w.findAll("button").find((b) => b.text().includes("닫기"));
        await closeBtn.trigger("click");

        expect(w.emitted("close")).toBeTruthy();

        // BaseModal close
        await w.find("button.close").trigger("click");
        expect(w.emitted("close")).toBeTruthy();
    });
});
