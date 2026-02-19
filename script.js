console.log('JS data loaded');
const addPebble = document.querySelector('.add-pebble-container');
const addPebbleBtn = document.querySelector('.add-pebble-btn');
const pebbleInput = document.querySelector('#pebble-input')
const pebbleMainList = document.querySelector('[data-pebble-main-list]')
const pebbleMainListCounter = document.querySelector('.pebble-counter')
const subPebbleListCounter = document.querySelector('.pebble-counter')

pebbleInput.addEventListener('keydown', (event) =>{
    if(event.key === 'Enter')
        addPebbleBtn.click();
});


// ======= saving pebbles for persistence =========
function savePebbles () {
    localStorage.setItem('pebbles', JSON.stringify(mainPebbles));
}
   
// ========= load pebbles ==============
function loadPebbles () {
    const storedPebbles = localStorage.getItem('pebbles');
    if (storedPebbles) {
        try {
            mainPebbles = JSON.parse(storedPebbles);
        } catch (error) {
            console.log('Corrupted storage. Resetting.');
            localStorage.removeItem('pebbles')
            mainPebbles = [];
            alert("Your saved Pebbles were corrupted and have been reset.");
        }
    mainPebbleRender();
    }
};

//Adding Main Pebbles
let mainPebbles = [] 

addPebbleBtn.addEventListener('click', () => {
    const pebbleText = pebbleInput.value.trim();

    if(!pebbleText) return;
    
    mainPebbles.push({
      id: Date.now(),
      text: pebbleText,
      subPebbles: []
    })

    savePebbles();
    mainPebbleRender();

    pebbleInput.value = '';
});

//Rendering Main Pebbles
let activePebbleId = null;

function mainPebbleRender () {
    pebbleMainList.innerHTML = '';
    
    // ------------------------ Pebbles Overview ----------------------------
    if(activePebbleId === null){
        mainPebbles.forEach(element => {
            pebbleMainList.classList.remove('focus-mode');
            const pebbleMainLi = document.createElement ('li');
            pebbleMainLi.classList.add('pebble-text');
            const pebbleMainSpan = document.createElement ('span');
            pebbleMainSpan.textContent = element.text

            pebbleMainLi.appendChild(pebbleMainSpan);

            const PebbleMainDeleteBt = document.createElement ('button');
            PebbleMainDeleteBt.classList.add('delete-btn');
            PebbleMainDeleteBt.textContent = "🗑️"
            pebbleMainLi.appendChild(PebbleMainDeleteBt);

            pebbleMainList.appendChild(pebbleMainLi);

            pebbleMainSpan.addEventListener('click', () => {
                activePebbleId = element.id
                mainPebbleRender();
            });

            PebbleMainDeleteBt.addEventListener('click', () =>{
                mainPebbles = mainPebbles.filter (p => p.id !==element.id);
                savePebbles();
                mainPebbleRender();
            
            });
        });
                        //counter for main Pebble
        const pebbleCounterTotal = mainPebbles.length
        pebbleMainListCounter.textContent = `You have ${pebbleCounterTotal} Pebbles in your day.`
        // ----------------------- Pebbles Focusu View --------------------------
    } else {
        const activePebble = mainPebbles.find(p => p.id === activePebbleId);
        pebbleMainList.classList.add('focus-mode')
        
        const backBtn = document.createElement('button');
        backBtn.textContent = "←";
        pebbleMainList.appendChild(backBtn);

        backBtn.addEventListener('click', () => {
            activePebbleId = null;
            mainPebbleRender();
        })

        // ========== rename pebble ==============
        const pebbleName = document.createElement('input');
        pebbleName.type = "text";
        pebbleName.value = activePebble.text;
        pebbleMainList.appendChild(pebbleName);
            
        pebbleName.addEventListener('keydown', (event) => {
            if(event.key === 'Enter') {

                mainPebbles = mainPebbles.map(p => {
                    if(p.id === activePebbleId) {
                        return {
                            ...p,
                            text: pebbleName.value
                        };
                    }
                    return p;
                });
                savePebbles();
                mainPebbleRender ();
            }
        });

        // ------------------- Adding Sub-pebble -----------------------
        const addSubPebbleInput = document.createElement('input');
        addSubPebbleInput.type = "text";
        addSubPebbleInput.placeholder ="Add Pebble items here"
        addSubPebbleInput.classList.add('sub-pebble-input');
        pebbleMainList.appendChild(addSubPebbleInput);
        const subPebbleListUl = document.createElement('ul')
        subPebbleListUl.classList.add('sub-pebble-list-ul')
        pebbleMainList.appendChild(subPebbleListUl);

        addSubPebbleInput.addEventListener('keydown', (event) =>{
            if(event.key === 'Enter') {
                let subPebbleText = addSubPebbleInput.value.trim();

                if(!subPebbleText) return;
        
                activePebble.subPebbles.push({
                id: Date.now(),
                text: subPebbleText,
                })

                savePebbles();
                mainPebbleRender();

                addSubPebbleInput.value = '';

                const subPebbleInput = document.querySelector ('.sub-pebble-input');
                if (activePebbleId !== null)
                    subPebbleInput.focus();
            }

        });

         activePebble.subPebbles.forEach(element => {
            const subPebbleLi = document.createElement ('li');
            subPebbleLi.classList.add('pebble-text')
            const subPebbleSpan = document.createElement ('span');
            subPebbleSpan.textContent = element.text

            subPebbleLi.appendChild(subPebbleSpan);

            const subPebbleDeleteBtn = document.createElement ('button');
            subPebbleDeleteBtn.classList.add('delete-btn');
            subPebbleDeleteBtn.textContent = "🗑️"
            subPebbleLi.appendChild(subPebbleDeleteBtn);

            
            subPebbleListUl.appendChild(subPebbleLi);

            subPebbleDeleteBtn.addEventListener('click', () =>{
                activePebble.subPebbles = activePebble.subPebbles.filter (p => p.id !==element.id);
                savePebbles();
                mainPebbleRender();
            
            });
         })
                        //counter for Sub Pebble
        const subPebbleCounterTotal = activePebble.subPebbles.length
        const subCounterPebbleName = activePebble.text
        subPebbleListCounter.textContent = `${subPebbleCounterTotal} items in ${subCounterPebbleName}.`
    }  
};

loadPebbles();