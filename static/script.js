
const diskCountInput = document.getElementById("diskCount");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const speedInput = document.getElementById("speed");
const speedLabel = document.getElementById("speedLabel");
const statusText = document.getElementById("status");
const progressBar = document.getElementById("progressBar");

const towers = {
    A: document.getElementById("towerA"),
    B: document.getElementById("towerB"),
    C: document.getElementById("towerC")
};

let disks = { A: [], B: [], C: [] };
let moves = [];
let moveIndex = 0;
let isRunning = false;
let isPaused = false;
let currentAnimation = null;
let generation = 0;

// 하노이의 탑 이동 순서 생성
function solveHanoi(n, from, auxiliary, to) {
    if (n === 1) {
        moves.push({ from, to });
        return;
    }

    solveHanoi(n - 1, from, to, auxiliary);
    moves.push({ from, to });
    solveHanoi(n - 1, auxiliary, from, to);
}

// 원판 생성 및 초기 배치
function createBoard() {
    Object.values(towers).forEach(tower => {
        tower.innerHTML = "";
    });

    disks = { A: [], B: [], C: [] };


    const count = Number(diskCountInput.value);

    // 원판 개수에 따라 기둥 높이 자동 조절
    const towerHeight = Math.max(310, count * 27 + 65);

    Object.values(towers).forEach(tower => {
        tower.style.setProperty("--tower-height", `${towerHeight}px`);
    });

    const towerWidth = towers.A.clientWidth;


    for (let size = count; size >= 1; size--) {
        const disk = document.createElement("div");

        disk.className = "disk";
        disk.dataset.size = size;

        const count = Number(diskCountInput.value);

        // 원판 크기를 개수에 맞춰 자동 조절
        const maxWidth = towerWidth * 0.90;
        const minWidth = Math.min(30, maxWidth * 0.35);
        const width = count === 1
            ? maxWidth
            : minWidth + (maxWidth - minWidth) * (size - 1) / (count - 1);

        disk.style.width = `${width}px`;
        disk.style.height = `${Math.max(10, Math.min(25, 300 / count))}px`;
        disk.style.background =
            `hsl(${225 + size * 18}, 75%, ${48 + size * 2}%)`;

        towers.A.appendChild(disk);
        disks.A.push(disk);
    }

    updateDiskPositions("A");
    updateProgress();
}

// 원판의 위치 계산
function updateDiskPositions(towerName) {
    const tower = towers[towerName];
    const stack = disks[towerName];

    stack.forEach((disk, index) => {
        const diskHeight = disk.offsetHeight || 25;

        disk.style.left =
            `${(tower.clientWidth - disk.offsetWidth) / 2}px`;

        disk.style.top =
            `${tower.clientHeight - 29 - diskHeight * (index + 1)}px`;
    });
}

// 진행률 갱신
function updateProgress() {
    const percentage = moves.length === 0
        ? 0
        : (moveIndex / moves.length) * 100;

    progressBar.style.width = `${percentage}%`;
}

// 버튼 상태 갱신
function updateButtons() {
    startButton.disabled = isRunning;
    pauseButton.disabled = !isRunning;
    pauseButton.textContent = isPaused ? "재개" : "일시정지";
    diskCountInput.disabled = isRunning;
}

// 지정된 시간 대기
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 원판 하나 이동 애니메이션
function animateMove(from, to, token) {
    return new Promise(resolve => {
        if (token !== generation) {
            resolve(false);
            return;
        }

        const sourceTower = towers[from];
        const targetTower = towers[to];
        const disk = disks[from][disks[from].length - 1];

        const sourceRect = sourceTower.getBoundingClientRect();
        const targetRect = targetTower.getBoundingClientRect();
        const diskRect = disk.getBoundingClientRect();

        const size = Number(disk.dataset.size);
        const targetStackHeight = disks[to].length;
        const diskHeight = disk.offsetHeight || 25;

        const targetLeft =
            (targetTower.clientWidth - disk.offsetWidth) / 2;

        const targetTop =
            targetTower.clientHeight - 29
            - diskHeight * (targetStackHeight + 1);

        const targetX =
            targetRect.left + targetLeft - diskRect.left;

        const targetY =
            targetRect.top + targetTop - diskRect.top;

        const animation = disk.animate(
            [
                { transform: "translate(0, 0)" },
                { transform: `translate(${targetX}px, ${targetY}px)` }
            ],
            {
                duration: Math.max(25, Number(speedInput.value) * 300),
                easing: "ease-in-out",
                fill: "forwards"
            }
        );

        currentAnimation = animation;

        animation.finished.then(() => {
            if (token !== generation) {
                resolve(false);
                return;
            }

            disks[from].pop();
            disks[to].push(disk);

            targetTower.appendChild(disk);
            disk.style.left = `${targetLeft}px`;
            disk.style.top = `${targetTop}px`;

            // 애니메이션의 transform 효과 제거
            animation.cancel();
            currentAnimation = null;

            updateDiskPositions(from);
            updateDiskPositions(to);

            resolve(true);
        }).catch(() => {
            resolve(false);
        });
    });
}

// 하노이의 탑 실행
async function runHanoi(token) {
    while (moveIndex < moves.length) {
        if (token !== generation) return;

        while (isPaused && token === generation) {
            await sleep(100);
        }

        if (token !== generation) return;

        const { from, to } = moves[moveIndex];

        const success = await animateMove(from, to, token);

        if (!success || token !== generation) return;

        moveIndex++;
        updateProgress();

        statusText.textContent =
            `이동 ${moveIndex} / ${moves.length} · ${from} → ${to}`;

        // 마지막 이동 이후에는 대기하지 않음
        if (moveIndex < moves.length) {
            await sleep(Number(speedInput.value) * 1000);
        }
    }

    if (token !== generation) return;

    isRunning = false;
    isPaused = false;

    updateButtons();

    statusText.textContent =
        `완료! 총 ${moves.length}번 이동했습니다.`;

    progressBar.style.width = "100%";
}

// 실행 버튼
startButton.addEventListener("click", () => {
    if (isRunning) return;

    const count = Number(diskCountInput.value);

    if (!Number.isInteger(count) || count < 1 || count > 15) {
        alert("원판은 1개부터 15개까지 입력할 수 있습니다.");
        diskCountInput.value = 3;
        return;
    }

    generation++;

    const token = generation;

    moves = [];
    moveIndex = 0;
    isRunning = true;
    isPaused = false;

    solveHanoi(count, "A", "B", "C");
    createBoard();

    statusText.textContent =
        `실행 중... 최소 이동 횟수: ${moves.length}회`;

    updateButtons();
    runHanoi(token);
});

// 일시정지 및 재개 버튼
pauseButton.addEventListener("click", () => {
    if (!isRunning) return;

    isPaused = !isPaused;

    if (currentAnimation) {
        if (isPaused) {
            currentAnimation.pause();
        } else {
            currentAnimation.play();
        }
    }

    statusText.textContent = isPaused
        ? "일시정지 중"
        : `실행 중... 이동 ${moveIndex} / ${moves.length}`;

    updateButtons();
});

// 초기화 버튼
resetButton.addEventListener("click", () => {
    generation++;

    if (currentAnimation) {
        currentAnimation.cancel();
        currentAnimation = null;
    }

    isRunning = false;
    isPaused = false;
    moves = [];
    moveIndex = 0;

    updateButtons();
    createBoard();

    statusText.textContent = "초기화 완료. 다시 실행할 수 있습니다.";
});

// 속도 조절
speedInput.addEventListener("input", () => {
    const speed = Number(speedInput.value);
    speedLabel.textContent = speed === 0
        ? "최고 속도"
        : `${speed.toFixed(2)}초`;
});

// 화면 크기 변경 시 원판 위치 재계산
window.addEventListener("resize", () => {
    Object.keys(towers).forEach(updateDiskPositions);
});

// 최초 화면 초기화
createBoard();
speedLabel.textContent = `${Number(speedInput.value).toFixed(2)}초`;
updateButtons();
