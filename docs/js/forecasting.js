"use strict";
const $ = selector => document.querySelector(selector)
const $$ = selector => document.querySelectorAll(selector)

const BOUNSING_LETTERS_TIME = 0.65
const BOUNCING_LETTERS_DELAY = 0.02
let demandPeriods = 6

const form = $("[data-form]")
const inputs = form.querySelectorAll('input')
const addRows = form.querySelectorAll('[data-addRow]')
const deleteRows = form.querySelectorAll('[data-deleteRow]')
const rangeInputs = $$("input[type='range']")


$$(".bouncing-text").forEach((el) => {
    el.style.setProperty("--speed", `${BOUNSING_LETTERS_TIME}s`)
})

addRows.forEach(btn => {
    const text = "Add New Row"
    for (let i = 0; i < text.length; i++) {
        const letter = document.createElement('div')
        letter.innerHTML = text[i] == " " ? "&nbsp;" : text[i]
        letter.classList.add('letter')
        letter.style.setProperty("--delay", `${i * BOUNCING_LETTERS_DELAY}s`)
        btn.append(letter)
    }
    btn.setAttribute("tabindex", "-1")
    setAddBtnListeners(btn)

})

function setAddBtnListeners(btn) {
    btn.addEventListener("click", () => {
        const tbody = btn.closest(".input-group,fieldset").querySelector("tbody")
        const template = tbody.querySelector("tr:last-of-type").cloneNode(true);
        if (btn.hasAttribute("data-period")) {
            const id = parseInt(template.firstElementChild.firstElementChild.value.slice(-1)) + 1
            template.firstElementChild.firstElementChild.value = `#${id}`
            template.lastElementChild.firstElementChild.setAttribute("data-demand", id)
        } else if (!btn.hasAttribute("data-depentent")) {
            const id = parseInt(template.firstElementChild.innerHTML.slice(-1)) + 1
            template.firstElementChild.innerHTML = `#${id}`
            if (btn.hasAttribute("data-product")) {
                const infoContainer = form.querySelector("[data-dependents]")
                const info = infoContainer.querySelector("[data-dependent]:last-of-type").cloneNode(true);
                info.setAttribute("data-dependent", id)
                info.querySelectorAll("input").forEach((inp) => {
                    if (!inp.hasAttribute('keep-value')) inp.value = null
                    inp.addEventListener("change", () => {
                        inp.reportValidity();
                    }
                    )
                })
                setAddBtnListeners(info.querySelector('[data-addRow]'))
                setDeleteBtnListeners(info.querySelector('[data-deleteRow]'))
                infoContainer.append(info)
            }
        }

        template.querySelectorAll("input").forEach((inp) => {
            if (!inp.hasAttribute('keep-value')) inp.value = null
            inp.addEventListener("change", () => {
                inp.reportValidity();
            }
            )
        })
        tbody.append(template)
    })
}

deleteRows.forEach(btn => {
    const text = "Delete Last Row"
    for (let i = 0; i < text.length; i++) {
        const letter = document.createElement('div')
        letter.innerHTML = text[i] == " " ? "&nbsp;" : text[i]
        letter.classList.add('letter')
        letter.style.setProperty("--delay", `${i * BOUNCING_LETTERS_DELAY}s`)
        btn.append(letter)
    }
    btn.setAttribute("tabindex", "-1")
    setDeleteBtnListeners(btn)
})

function setDeleteBtnListeners(btn) {
    btn.addEventListener("click", () => {
        const tbody = btn.closest(".input-group,fieldset").querySelector("tbody")
        if (tbody.childElementCount == 1 || (tbody.childElementCount == 6 && btn.hasAttribute("data-period"))) return alert(`must have at least ${tbody.childElementCount} row(s)`)
        // const id = tbody.lastElementChild.firstElementChild.innerHTML.slice(-1)
        tbody.lastElementChild.remove()
        if (btn.hasAttribute("data-material")) updateMat()
    })
}

inputs.forEach(inp => {
    inp.required = 'required'
    inp.addEventListener("change", () => {
        inp.reportValidity();
    })
})

rangeInputs.forEach(inp => {
    const avg = parseFloat(inp.max) / 3 + parseFloat(inp.min) * 2 / 3
    inp.step = "0.5"
    inp.setAttribute("strValue", String(avg.toFixed(2)))
    inp.value = avg
    inp.style.setProperty('--value', String(parseFloat(inp.value - inp.min) * 97 / (inp.max - inp.min)))
    inp.addEventListener("input", () => {
        inp.setAttribute('strValue', String((inp.value * 1).toFixed(2)));
        inp.style.setProperty('--value', String((inp.value - inp.min) * 97 / (inp.max - inp.min)))
    })
})

$("#clear").addEventListener("click", clearForm)

function clearForm(){
    $$("input").forEach(inp=>{
        if(inp.hasAttribute("keep-value")) return
        inp.value=inp.getAttribute("init-value");
    })
    while($("#Products>tbody").childElementCount>1){
        $("#Products>tbody").lastElementChild.remove()
    }
    while($("#rawMaterials>tbody").childElementCount>1){
        $("#rawMaterials>tbody").lastElementChild.remove()
    }
    $("#Mats").innerHTML=null
}

function editProduct(e) {
    const id = parseInt(e.closest("tr").firstElementChild.innerHTML.slice(-1))
    const info = form.querySelector(`[data-dependent='${id}']`)
    info.classList.add('active')
    const closeBtn = info.querySelector("#close")
    closeBtn.addEventListener('click', close, { once: true })
    window.addEventListener('keydown', closeEsc, { once: true })

    setDependents(info.querySelector("tbody"))
    setDemandPeriods(info.querySelector("[data-demands]"))

    function close() {
        window.removeEventListener('keydown', closeEsc)
        closeBtn.parentElement.classList.remove("active")
    }
    function closeEsc(e) {
        if (e.keyCode == 27) {
            closeBtn.removeEventListener('click', close)
            closeBtn.parentElement.classList.remove("active")
        } else {
            window.addEventListener('keydown', closeEsc, { once: true })
        }
    }
}

function setDependents(tbody) {
    const materials = $("#Mats")
    const selects = tbody.querySelectorAll("select")
    selects.forEach((slct) => {
        const val = slct.value
        slct.innerHTML = materials.innerHTML
        slct.value = val
    })
}

function setDemandPeriods(container) {
    while (container.childElementCount < demandPeriods) {
        const newChild = container.lastElementChild.cloneNode(true)
        newChild.lastElementChild.value='';
        container.append(newChild)
    }
    while (demandPeriods>0 && container.childElementCount > demandPeriods) {
        container.lastElementChild.remove()
    }
    [...container.children].forEach((ch, i)=>{
        ch.firstElementChild.innerHTML = "#" + (i+1)
    })
}

function updateMat() {
    const list = $("#Mats")
    list.innerHTML = null
    $("#rawMaterials").querySelectorAll("tbody>tr").forEach((row, id) => {
        const matData = {}
        row.querySelectorAll("input").forEach((inp) => matData[inp.name] = inp.value)
        const option = document.createElement('option')
        option.value = id
        option.innerHTML = `${matData.name} (ID: ${matData.matID})`
        list.append(option)
    })
}

function updateDemands() {
    const val = $("input[name='demandPeriods']").value
    if (parseInt(val) == val) demandPeriods = parseInt(val)
}