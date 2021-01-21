<template>
	<div
		id="filepicker"
		@drop="onDrop"
		@dragover="onDragover"
		@dragenter="onDragenter"
		@dragleave="onDragleave"
		:class="isDragging && 'dragging'"
	>
		<div>
			<h3>Drag and drop files to start</h3>
			<p>Or use the button:</p>
			<label class="button-label">
				<input
					class="button"
					type="file"
					@input="onChange"
					ref="picker"
					multiple
					accept="video/*"
				/>
				<span class="pseudobutton"></span>
			</label>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component
export default class FilePicker extends Vue {
	@Prop() private msg!: string

	private isDragging = false

	onChange(): void {
		const files = (this.$refs.picker as HTMLInputElement).files
		if (!files) return

		const paths = [...files].map((f: File) => f.path)

		this.$store.dispatch('receiveFiles', paths)
	}

	onDragenter(ev: DragEventInit) {
		this.isDragging = true
	}

	onDragover(ev: Event) {
		ev.preventDefault()
	}

	onDragleave() {
		this.isDragging = false
	}

	onDrop(ev: DragEvent): void {
		ev.preventDefault()
		this.isDragging = false
		if (!ev.dataTransfer) return

		const paths = [...ev.dataTransfer.files].map((f: File) => f.path)

		this.$store.dispatch('receiveFiles', paths)
	}
}
</script>

<style scoped>
#filepicker {
	position: absolute;
	top: 10vh;
	bottom: 10vh;
	left: 10vw;
	right: 10vw;

	border: 1vw dashed #5f5f5f;
	border-radius: 3vw;

	display: flex;
	justify-content: center;
	flex-direction: column;
}
#filepicker.dragging {
	border-color: #d0d0d0;
}

.fill {
	width: 100%;
	height: 100%;
}

.button {
	display: none;
}
.pseudobutton::before {
	opacity: 1;
	content: 'Select files';
	display: inline-block;
	background: #1a6ebb;
	color: white;
	box-shadow: inset 2px 2px 4px rgba(175, 175, 175, 0.25);
	border-radius: 4px;
	font-size: 1.2rem;
	line-height: 2.5rem;
	height: 2.5rem;
	padding-left: 0.5rem;
	padding-right: 0.5rem;
}
</style>
