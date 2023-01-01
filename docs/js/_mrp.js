import { app } from "./fb-auth-init.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js'
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'

const auth = getAuth()
const db = getFirestore(app);

const $ = selector => document.querySelector(selector)
const $$ = selector => document.querySelectorAll(selector)

const models = {
    "FQ": "Fixed Quantity",
    "FP": "Fixed Period",
    "LFL": "Lot For Lot",
    "inventoryHold": "Inventory Hold",
}

$$("input[type='number']").forEach(inp => {
    if (!inp.disabled) inp.required = 'required'
    inp.value = inp.getAttribute("init-value")
    inp.addEventListener("change", () => {
        inp.reportValidity();
    })
})

$("#FutureDemands").addEventListener("change", updateDemands)

function updateDemands() {
    const container = $('[data-demands]')
    container.parentElement.removeAttribute("style")
    const demandPeriods = $('#FutureDemands').value
    while (container.childElementCount < demandPeriods) {
        const newChild = container.lastElementChild.cloneNode(true)
        newChild.lastElementChild.value = '';
        container.append(newChild)
    }
    while (demandPeriods > 0 && container.childElementCount > demandPeriods) {
        container.lastElementChild.remove()
    }
    [...container.children].forEach((ch, i) => {
        ch.firstElementChild.innerHTML = "#" + (i + 1)
    })
}

$("#deliveryTime").addEventListener("change", delayDemands)

function delayDemands(e) {
    const leadTime = parseInt($("#deliveryTime").value) || 0
    $$("[data-demands]>.input-group>label").forEach((el, i) => {
        el.innerHTML = "#" + (i + 1 + leadTime)
    })
}


// $("#inventoryConstraint").addEventListener("change", () => toggleInput('inventoryMaxLevel'))
$("#isFixedPeriod").addEventListener("change", () => toggleInput('fixedPeriod'))

function toggleInput(inpID) {
    document.getElementById(inpID).disabled = !document.getElementById(inpID).disabled;
    document.getElementById(inpID).required = !document.getElementById(inpID).required
}

$("#clear").addEventListener("click", clearForm)

function clearForm() {
    $(':has(>[data-demands])').style.display = 'none'
    $$("input").forEach(inp => {
        if (inp.hasAttribute("keep-value")) return
        inp.value = inp.getAttribute("init-value") || "";
    })
}

$("[data-form]").addEventListener("submit", handleFormSubmition)

function handleFormSubmition(e) {
    e.preventDefault()
    if (![...$$("input")].every(inp => inp.reportValidity())) return
    const demands = [...$$('[data-demands] input')].map(inp => parseInt(inp.value))
    const existingInventory = parseInt($('input#existingInventory').value)

    $$("#results>*:not(template").forEach(ch => ch.remove()) // clean last print
    if (existingInventory >= sum(demands)) {
        return alert("Ypu have enough inventory to fulfill the demands")
    }
    const invHoldCost = parseInt($("input#inventoryHoldingCost").value)
    const orderCost = parseInt($("input#orderCost").value)
    const leadTime = parseInt($("input#deliveryTime").value)
    const fixedPeriod = $('input#isFixedPeriod').checked ? parseInt($('input#fixedPeriod').value) : NaN

    const data = { demands, invHoldCost, orderCost, leadTime, fixedPeriod, existingInventory }
    const mrp = {}
    mrp['inventoryHold'] = inventoryHold(data)
    mrp['LFL'] = LFL(data)
    mrp['FQ'] = FQ(data)
    if ($('input#isFixedPeriod').checked) {
        mrp['FP'] = FP(data)
    }

    let minCost = Infinity
    for (let model in mrp) {
        const res = mrp[model]
        minCost = Math.min(res.totalCost, minCost)
        if (minCost == res.totalCost) mrp["bestModel"] = model
    }
    printResults(mrp, data)
    const details = {
        time: new Date().toString(),
        local: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    const dataToDB = { data, details, results: mrp }
    saveDB(dataToDB)
}

function inventoryHold({ demands, orderCost, invHoldCost, leadTime, existingInventory }) {
    var invPerPeriod = demands.map((x, i, arr) => sum(arr.slice(i)) - x)
    const orderPerPeriod = Array(demands.length + leadTime).fill(0)
    orderPerPeriod[0] = Math.max(sum(demands) - existingInventory, 0)

    const offset = orderPerPeriod.length - invPerPeriod.length
    for (let i = 1; i < offset + 1; i++) {
        invPerPeriod = [existingInventory, ...invPerPeriod]
    }
    const totalInvCost = invHoldCost * sum(invPerPeriod)
    const numOfOrders = orderPerPeriod.filter((x) => x > 0).length
    const totalOrderCost = orderCost * numOfOrders
    const totalCost = totalInvCost + totalOrderCost;
    return { orderPerPeriod, totalCost, totalInvCost, invPerPeriod, totalOrderCost, numOfOrders }
}

function FQ({ demands, orderCost, invHoldCost, leadTime, existingInventory }) {
    const cumulative = demands.map((_, i, arr) => sum(arr.slice(0, i + 1))) // cumulative Sum: [30, 40, 50] => [30, 70, 120]
    const wAvg = cumulative.map((x, i) => x / (i + 1))
    const fixedQ = wAvg.reduce((s, x) => Math.max(s, x)) // find max of wAvg
    var invPerPeriod = cumulative.map((x, i) => fixedQ * (i + 1) - x)
    const orderPerPeriod = Array(demands.length).fill(fixedQ)
    let exInv = existingInventory
    let i = 0
    while (exInv > 0) {
        const quan = orderPerPeriod[i]
        orderPerPeriod[i] = Math.max(0, orderPerPeriod[i] - exInv)
        exInv -= quan
        i++
    }
    for (let i = 0; i < leadTime; i++) {
        orderPerPeriod.push(0)
    }
    const offset = orderPerPeriod.length - invPerPeriod.length
    for (let i = 1; i < offset + 1; i++) {
        invPerPeriod = [existingInventory, ...invPerPeriod]
    }
    const totalInvCost = invHoldCost * sum(invPerPeriod)
    const numOfOrders = orderPerPeriod.filter((x) => x > 0).length
    const totalOrderCost = orderCost * numOfOrders
    const totalCost = totalInvCost + totalOrderCost;
    return { orderPerPeriod, fixedQ, invPerPeriod, totalInvCost, totalCost, totalOrderCost, numOfOrders }
}

function FP({ demands, orderCost, invHoldCost, fixedPeriod, leadTime, existingInventory }) {
    const orderPerPeriod = []
    demands.forEach((_, i) => {
        if (i % fixedPeriod == 0) orderPerPeriod.push(sum(demands.slice(i, i + fixedPeriod)))
        else orderPerPeriod.push(0)
    })
    let exInv = existingInventory
    let i = 0
    while (exInv > 0) {
        const quan = orderPerPeriod[i]
        orderPerPeriod[i] = Math.max(0, orderPerPeriod[i] - exInv)
        exInv -= quan
        i++
    }
    for (let i = 0; i < leadTime; i++) {
        orderPerPeriod.push(0)
    }

    var invPerPeriod = demands.map((_, i) => (sum(orderPerPeriod.slice(0, i + 1)) + existingInventory - sum(demands.slice(0, i + 1))))

    const offset = orderPerPeriod.length - invPerPeriod.length
    for (let i = 1; i < offset + 1; i++) {
        invPerPeriod = [existingInventory, ...invPerPeriod]
    }
    const totalInvCost = invHoldCost * sum(invPerPeriod)
    const numOfOrders = orderPerPeriod.filter((x) => x > 0).length
    const totalOrderCost = orderCost * numOfOrders
    const totalCost = totalInvCost + totalOrderCost;
    return { orderPerPeriod, invPerPeriod, totalInvCost, totalCost, totalOrderCost, numOfOrders }
}

function LFL({ demands, orderCost, invHoldCost, leadTime, existingInventory }) {
    var invPerPeriod = Array(demands.length).fill(0);
    const orderPerPeriod = demands
    while (orderPerPeriod.length < demands.length) {
        orderPerPeriod.push(0)
    }
    let exInv = existingInventory
    let i = 0
    while (exInv > 0) {
        const quan = orderPerPeriod[i]
        orderPerPeriod[i] = Math.max(0, orderPerPeriod[i] - exInv)
        exInv -= quan
        i++
    }
    for (let i = 0; i < leadTime; i++) {
        orderPerPeriod.push(0)
    }
    const offset = orderPerPeriod.length - invPerPeriod.length
    for (let i = 1; i < offset + 1; i++) {
        invPerPeriod = [existingInventory, ...invPerPeriod]
    }
    const totalInvCost = invHoldCost * sum(invPerPeriod)
    const numOfOrders = orderPerPeriod.filter((x) => x > 0).length
    const totalOrderCost = orderCost * numOfOrders
    const totalCost = totalInvCost + totalOrderCost;
    return { orderPerPeriod, invPerPeriod, totalInvCost, totalCost, totalOrderCost, numOfOrders }
}

function sum(arr) {
    return arr.reduce((s, x) => s + x, 0)
}

function printResults(mrp, { demands, existingInventory }) {
    const model = mrp.bestModel
    const res = mrp[model]
    const template = $("#results>template").content.cloneNode(true)
    template.querySelector(`h2>span[data-model]`).outerHTML = models[model]
    template.querySelector(`div[invCost]>span[data-val]`).outerHTML = res.totalInvCost
    template.querySelector(`div[orderCost]>span[data-val]`).outerHTML = res.totalOrderCost
    template.querySelector(`div[totalCost]>span[data-val]`).outerHTML = res.totalCost
    template.querySelector(`div[totalProductAmount]>span[data-val]`).outerHTML = sum(demands)
    template.querySelector(`div[numOfOrders]>span[data-val]`).outerHTML = res.numOfOrders
    if (model == "FQ") template.querySelector(`div[orderQuantity]>span[data-val]`).outerHTML = res.fixedQ
    else template.querySelector(`div[orderQuantity]`).remove()
    const offset = res.orderPerPeriod.length - res.invPerPeriod.length

    res.orderPerPeriod.forEach((x, i) => {
        const div = document.createElement("div")
        div.classList.add("input-group")
        const label = document.createElement("label")
        label.classList.add("center")
        label.innerHTML = `#${i + 1}`
        div.append(label)
        const input = document.createElement("input")
        input.disabled = true
        input.value = x
        div.append(input)
        template.querySelector("[orderPerPeriod]").append(div)
    })

    res.invPerPeriod.forEach((x, i) => {
        const div = document.createElement("div")
        div.classList.add("input-group")
        const label = document.createElement("label")
        label.classList.add("center")
        label.innerHTML = `#${i + 1 + offset}`
        div.append(label)
        const input = document.createElement("input")
        input.disabled = true
        input.value = x
        div.append(input)
        template.querySelector("[invPerPeriod]").append(div)
    })

    $("#results").append(template)
}

async function saveDB(data) {
    const docRef = doc(db, "users", auth.currentUser.uid)
    const docSnap = (await getDoc(docRef)).data()
    await updateDoc(docRef, {
        mrp: [...docSnap.mrp, data]
    })
}