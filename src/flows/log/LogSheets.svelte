<!-- The logging sheets, mounted once in App.svelte and loaded together after the first paint. -->
<script lang="ts">
  import AddSheet from './AddSheet.svelte';
  import SearchSheet from './SearchSheet.svelte';
  import QuickAddSheet from './QuickAddSheet.svelte';
  import MealSheet from './MealSheet.svelte';
  import HowSheet from './HowSheet.svelte';
  import SessionSheet from './SessionSheet.svelte';
</script>

<AddSheet />
<MealSheet />
<SearchSheet />
<QuickAddSheet />
<HowSheet />
<SessionSheet />
