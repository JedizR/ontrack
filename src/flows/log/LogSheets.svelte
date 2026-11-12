<!-- The logging sheets, mounted once in App.svelte and loaded together after the first paint. -->
<script lang="ts">
  import AddSheet from './AddSheet.svelte';
  import SearchSheet from './SearchSheet.svelte';
  import QuickAddSheet from './QuickAddSheet.svelte';
  import MealSheet from './MealSheet.svelte';
  import HowSheet from './HowSheet.svelte';
  import SessionSheet from './SessionSheet.svelte';
  import DescribeSheet from './DescribeSheet.svelte';
  import ReviewSheet from './ReviewSheet.svelte';
  import SupplementSheet from './SupplementSheet.svelte';
  import ScanSheet from './ScanSheet.svelte';
</script>

<AddSheet />
<DescribeSheet />
<ReviewSheet />
<MealSheet />
<SearchSheet />
<QuickAddSheet />
<HowSheet />
<SessionSheet />
<SupplementSheet />
<ScanSheet />
